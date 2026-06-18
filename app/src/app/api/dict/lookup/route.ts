import { DEFAULT_2000NL_API_BASE } from '@/lib/providers/dictionary';
import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';
import { getBearerToken } from '@/lib/twoThousandNlPlatform';

const CARD_TYPE_ID = 'word-to-definition';
const CONTRACT_VERSION = 'dict-lookup-v2';

type OverlaySection = {
  id: string;
  sourcePath: string;
  kind: string;
  label?: string;
  text: string;
  translation?: string;
};

type PlatformCardCapabilities = {
  phase?: string;
  actions?: string[];
  reviewResults?: string[];
  frozenUntil?: string | null;
};

type PlatformLookupItem = {
  entry?: {
    id?: string;
    dictionaryId?: string | null;
    languageCode?: string | null;
    headword?: string | null;
    partOfSpeech?: string | null;
    gender?: string | null;
    content?: Record<string, unknown> | null;
    contentFingerprint?: string | null;
  } | null;
  dictionary?: {
    id?: string;
    slug?: string;
    name?: string;
    kind?: string;
  } | null;
  match?: {
    queriedForm?: string;
    matchedForm?: string;
    relation?: string;
  } | null;
  cardCapabilitiesByType?: Record<string, PlatformCardCapabilities>;
  userStateByCardType?: Record<string, {
    seenCount?: number;
    lastSeenAt?: string;
    frozenUntil?: string;
  } | unknown>;
};

type PlatformLookupResponse = {
  query?: string;
  request?: unknown;
  items?: PlatformLookupItem[];
  error?: string;
  detail?: string;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['POST', 'OPTIONS'] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const clickedForm = typeof body?.clickedForm === 'string' ? body.clickedForm.trim() : '';
  const sourceLanguageCode =
    typeof body?.sourceLanguageCode === 'string' ? body.sourceLanguageCode.trim() : '';
  const contextText = typeof body?.contextText === 'string' ? body.contextText : undefined;

  if (!clickedForm) {
    return jsonResponse(request, { error: 'missing_clicked_form' }, { status: 400 });
  }
  if (!sourceLanguageCode) {
    return jsonResponse(request, { error: 'missing_source_language_code' }, { status: 400 });
  }

  const forwardedBearer = getBearerToken(request);
  const guestToken = forwardedBearer ? undefined : getLocalDogfoodGuestLookupToken();
  const accessToken = forwardedBearer || guestToken;
  if (!accessToken) {
    return jsonResponse(
      request,
      {
        error: 'authentication_required',
        code: 'authentication_required',
        detail:
          'Guest 2000NL lookup is disabled until a public catalog credential or endpoint is available.',
      },
      { status: 401 },
    );
  }

  const platformResponse = await fetch(`${platformApiBase()}/lookup`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: clickedForm,
      languageCode: sourceLanguageCode,
      contextText,
      includeUserState: Boolean(forwardedBearer),
      intent: 'external-click',
    }),
  });
  const platformBody = (await platformResponse.json().catch(() => null)) as
    | PlatformLookupResponse
    | null;

  if (!platformResponse.ok) {
    return jsonResponse(
      request,
      {
        error: mapPlatformError(platformResponse.status),
        code: mapPlatformError(platformResponse.status),
        detail: platformBody?.error || platformBody?.detail || null,
      },
      {
        status: platformResponse.status === 429 ? 429 : 502,
        headers: forwardedBearer ? { 'Cache-Control': 'private, no-store' } : undefined,
      },
    );
  }

  const cards = (platformBody?.items || []).map((item, index) =>
    projectOverlayCard(item, clickedForm, sourceLanguageCode, index),
  );

  if (!cards.length) {
    return jsonResponse(
      request,
      {
        contractVersion: CONTRACT_VERSION,
        clickedForm,
        query: platformBody?.query || clickedForm,
        cards: [],
        error: 'no_match',
        code: 'no_match',
        meta: { provider: '2000nl', responseVersion: 'overlay-v2' },
      },
      {
        status: 404,
        headers: forwardedBearer ? { 'Cache-Control': 'private, no-store' } : undefined,
      },
    );
  }

  const firstCard = cards[0];
  return jsonResponse(
    request,
    {
      contractVersion: CONTRACT_VERSION,
      clickedForm,
      query: platformBody?.query || clickedForm,
      result: {
        word: firstCard.headword,
        language: firstCard.language || sourceLanguageCode,
        definition: firstCard.summary.definition,
        context: contextText,
      },
      definitions: firstCard.summary.definition ? [firstCard.summary.definition] : [],
      cards,
      meta: {
        provider: '2000nl',
        fallbackUsed: false,
        responseVersion: 'overlay-v2',
      },
    },
    {
      status: 200,
      headers: forwardedBearer ? { 'Cache-Control': 'private, no-store' } : undefined,
    },
  );
}

function platformApiBase() {
  return (process.env.DICTIONARY_2000NL_API_BASE?.trim() || DEFAULT_2000NL_API_BASE).replace(
    /\/+$/,
    '',
  );
}

function getLocalDogfoodGuestLookupToken() {
  const enabled =
    process.env.DICTIONARY_2000NL_LOCAL_DOGFOOD_GUEST_LOOKUP === 'true' &&
    process.env.NODE_ENV !== 'production';
  if (!enabled) return undefined;
  return process.env.DICTIONARY_2000NL_ACCESS_TOKEN?.trim() || undefined;
}

function projectOverlayCard(
  item: PlatformLookupItem,
  clickedForm: string,
  sourceLanguageCode: string,
  index: number,
) {
  const content = item.entry?.content || {};
  const headword =
    stringValue(content.headword) ||
    stringValue(item.entry?.headword) ||
    item.match?.matchedForm ||
    clickedForm;
  const sections = normalizedSections(content);
  const definition = sections.find((section) => section.kind === 'meaning')?.text || '';
  const example = sections.find((section) => section.kind === 'example')?.text;
  const capabilities = item.cardCapabilitiesByType?.[CARD_TYPE_ID];
  const phase = normalizedPhase(capabilities?.phase);
  const progress = phase
    ? {
        phase,
        ...progressFields(item.userStateByCardType?.[CARD_TYPE_ID], capabilities),
      }
    : null;

  return {
    id: item.entry?.id || `${headword}-${index}`,
    entryId: item.entry?.id,
    cardTypeId: CARD_TYPE_ID,
    clickedForm,
    headword,
    language: item.entry?.languageCode || sourceLanguageCode,
    match: {
      matchedForm: item.match?.matchedForm,
      relation: normalizedMatchRelation(item.match?.relation),
    },
    contentFingerprint: item.entry?.contentFingerprint || undefined,
    chips: chipsFromContent(item, content),
    summary: { definition, example },
    sections,
    progress,
    displayActions: displayActionsForCapabilities(capabilities),
    dictionary: item.dictionary
      ? {
          id: item.dictionary.id,
          slug: item.dictionary.slug,
          name: item.dictionary.name,
          kind: item.dictionary.kind,
        }
      : undefined,
    meanings: sections
      .filter((section) => section.kind === 'meaning')
      .map((section) => ({
        definition: section.text,
        examples: [],
        idioms: [],
      })),
  };
}

function normalizedSections(content: Record<string, unknown>) {
  const sections = arrayValue(content.sections)
    .map((section, index) => normalizedSection(section, index))
    .filter((section): section is OverlaySection => Boolean(section));
  if (sections.length) return sections;

  const meanings = arrayValue(content.meanings)
    .map((meaning, index) => normalizedMeaning(meaning, index))
    .filter((meaning): meaning is OverlaySection => Boolean(meaning));
  if (meanings.length) return meanings;

  const definition = stringValue(content.definition) || stringValue(content.shortDefinition);
  return definition
    ? [{ id: 'meaning-0', sourcePath: 'content.definition', kind: 'meaning', text: definition }]
    : [];
}

function normalizedSection(section: unknown, index: number): OverlaySection | null {
  if (!isRecord(section)) return null;
  const text = stringValue(section.text) || stringValue(section.definition);
  if (!text) return null;
  return {
    id: stringValue(section.id) || `section-${index}`,
    sourcePath: stringValue(section.sourcePath) || `content.sections.${index}`,
    kind: normalizedSectionKind(section.kind),
    label: stringValue(section.label) || undefined,
    text,
    translation: stringValue(section.translation) || undefined,
  };
}

function normalizedMeaning(meaning: unknown, index: number): OverlaySection | null {
  if (!isRecord(meaning)) return null;
  const text = stringValue(meaning.definition) || stringValue(meaning.text);
  if (!text) return null;
  return {
    id: stringValue(meaning.id) || `meaning-${index}`,
    sourcePath: `content.meanings.${index}`,
    kind: 'meaning',
    label: stringValue(meaning.label) || stringValue(meaning.context) || undefined,
    text,
  };
}

function chipsFromContent(item: PlatformLookupItem, content: Record<string, unknown>) {
  return [
    chip('part-of-speech', stringValue(content.partOfSpeech) || stringValue(item.entry?.partOfSpeech)),
    chip('language', item.entry?.languageCode || stringValue(content.languageCode)),
    chip('dictionary', item.dictionary?.name || item.dictionary?.slug),
    chip('form', stringValue(content.gender) || stringValue(item.entry?.gender)),
  ].filter(Boolean);
}

function chip(kind: string, label?: string | null) {
  return label ? { kind, label } : null;
}

function displayActionsForCapabilities(capabilities: PlatformCardCapabilities | undefined) {
  const phase = normalizedPhase(capabilities?.phase);
  const actions = new Set(capabilities?.actions || []);
  const reviewResults = new Set(capabilities?.reviewResults || []);
  const displayActions = [];

  if ((phase === 'not-started' || phase === 'encountered') && actions.has('start-learning')) {
    displayActions.push(progressAction('learn', 'Learn', 'start-learning'));
  }
  if ((phase === 'not-started' || phase === 'encountered') && actions.has('mark-known')) {
    displayActions.push(progressAction('known', 'Known', 'mark-known', undefined, true));
  }
  if ((phase === 'learning' || phase === 'reviewing') && actions.has('review-card')) {
    if (reviewResults.has('fail')) displayActions.push(progressAction('again', 'Again', 'review-card', 'fail', true));
    if (reviewResults.has('hard')) displayActions.push(progressAction('hard', 'Hard', 'review-card', 'hard', true));
    if (reviewResults.has('success')) displayActions.push(progressAction('good', 'Good', 'review-card', 'success', true));
    if (reviewResults.has('easy')) displayActions.push(progressAction('easy', 'Easy', 'review-card', 'easy', true));
  }

  displayActions.push({
    id: 'translate',
    label: 'Translate',
    group: 'translation',
    command: { kind: 'card-translation' },
  });
  return displayActions;
}

function progressAction(
  id: string,
  label: string,
  action: string,
  result?: string,
  turnIdRequired = false,
) {
  return {
    id,
    label,
    group: 'progress',
    command: {
      kind: 'platform-action',
      action,
      ...(result ? { result } : {}),
      ...(turnIdRequired ? { turnIdRequired } : {}),
    },
  };
}

function progressFields(userState: unknown, capabilities: { frozenUntil?: string | null } | undefined) {
  if (!isRecord(userState)) {
    return capabilities?.frozenUntil ? { frozenUntil: capabilities.frozenUntil } : {};
  }
  return {
    ...(typeof userState.seenCount === 'number' ? { seenCount: userState.seenCount } : {}),
    ...(stringValue(userState.lastSeenAt) ? { lastSeenAt: stringValue(userState.lastSeenAt) } : {}),
    ...(stringValue(userState.frozenUntil) || capabilities?.frozenUntil
      ? { frozenUntil: stringValue(userState.frozenUntil) || capabilities?.frozenUntil }
      : {}),
  };
}

function normalizedPhase(value: unknown) {
  const phase = stringValue(value);
  return [
    'not-started',
    'encountered',
    'learning',
    'reviewing',
    'hidden',
    'frozen',
  ].includes(phase)
    ? phase
    : null;
}

function normalizedMatchRelation(value: unknown) {
  const relation = stringValue(value);
  return ['exact', 'inflection', 'lemma', 'fuzzy', 'unknown'].includes(relation)
    ? relation
    : 'unknown';
}

function normalizedSectionKind(value: unknown) {
  const kind = stringValue(value);
  return ['meaning', 'example', 'idiom', 'form', 'note'].includes(kind) ? kind : 'meaning';
}

function mapPlatformError(status: number) {
  if (status === 401 || status === 403) return 'authentication_required';
  if (status === 404) return 'no_match';
  if (status === 429) return 'rate_limited';
  return 'platform_unavailable';
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
