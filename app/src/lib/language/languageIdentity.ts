export type LanguageIdentity = {
  raw: string;
  canonicalTag: string;
  baseLanguage: string;
  script: string;
  region: string;
  asrLanguage: string;
};

export type LanguageCompatibility = 'exact' | 'compatible' | 'incompatible' | 'ambiguous';

const LEGACY_ALIASES: Record<string, string> = {
  he: 'he',
  iw: 'he',
  id: 'id',
  in: 'id',
  yi: 'yi',
  ji: 'yi',
  jw: 'jw',
  jv: 'jw',
};

const WHISPER_LANGUAGES = new Set([
  'af', 'am', 'ar', 'as', 'az', 'ba', 'be', 'bg', 'bn', 'bo', 'br', 'bs', 'ca', 'cs', 'cy',
  'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi', 'fo', 'fr', 'gl', 'gu', 'ha', 'haw',
  'he', 'hi', 'hr', 'ht', 'hu', 'hy', 'id', 'is', 'it', 'ja', 'jw', 'ka', 'kk', 'km', 'kn',
  'ko', 'la', 'lb', 'ln', 'lo', 'lt', 'lv', 'mg', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt',
  'my', 'ne', 'nl', 'nn', 'no', 'oc', 'pa', 'pl', 'ps', 'pt', 'ro', 'ru', 'sa', 'sd', 'si',
  'sk', 'sl', 'sn', 'so', 'sq', 'sr', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'tk', 'tl',
  'tr', 'tt', 'uk', 'ur', 'uz', 'vi', 'yi', 'yo', 'yue', 'zh',
]);

function parts(value: string) {
  const rawParts = value.trim().replace(/_/g, '-').split('-').filter(Boolean);
  const language = (rawParts[0] || '').toLowerCase();
  const subtags = rawParts.slice(1);
  const scriptPart = subtags.find((part) => /^[A-Za-z]{4}$/.test(part));
  const regionPart = subtags.find((part) => /^[A-Za-z]{2}$/.test(part) || /^\d{3}$/.test(part));
  const baseLanguage = LEGACY_ALIASES[language] || language;
  return {
    baseLanguage,
    script: scriptPart ? scriptPart[0].toUpperCase() + scriptPart.slice(1).toLowerCase() : '',
    region: regionPart && /^[A-Za-z]{2}$/.test(regionPart) ? regionPart.toUpperCase() : regionPart || '',
  };
}

export function identifyLanguage(value: unknown): LanguageIdentity {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw.toLowerCase() === 'auto') {
    return { raw, canonicalTag: '', baseLanguage: '', script: '', region: '', asrLanguage: '' };
  }
  const { baseLanguage, script, region } = parts(raw);
  const canonicalTag = [baseLanguage, script, region].filter(Boolean).join('-');
  return {
    raw,
    canonicalTag,
    baseLanguage,
    script,
    region,
    asrLanguage: baseLanguage,
  };
}

export function normalizeWhisperLanguage(value: unknown): string {
  const identity = identifyLanguage(value);
  if (!WHISPER_LANGUAGES.has(identity.asrLanguage)) {
    throw new Error(`unsupported_language:${identity.asrLanguage || 'empty'}`);
  }
  return identity.asrLanguage;
}

export function compareLanguageIdentity(left: unknown, right: unknown): LanguageCompatibility {
  const a = identifyLanguage(left);
  const b = identifyLanguage(right);
  if (!a.canonicalTag || !b.canonicalTag) return 'incompatible';
  if (a.canonicalTag === b.canonicalTag) return 'exact';
  if (a.baseLanguage !== b.baseLanguage) return 'incompatible';
  if (a.script && b.script && a.script !== b.script) return 'incompatible';
  if (a.region && b.region && a.region !== b.region) return 'incompatible';
  return 'compatible';
}

export function whisperLanguages(): readonly string[] {
  return [...WHISPER_LANGUAGES].sort();
}
