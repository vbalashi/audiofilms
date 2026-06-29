import crypto from 'node:crypto';

export type AudioResolveTokenPayload = {
  v: 1;
  text: string;
  languageCode: string;
  purpose: 'dictionary-headword' | 'manual-dictionary-card';
  exp: number;
};

const TOKEN_TTL_MS = 10 * 60 * 1000;

function secret() {
  return (
    process.env.AUDIO_RESOLVE_TOKEN_SECRET?.trim() ||
    process.env.DICTIONARY_2000NL_CATALOG_ACCESS_TOKEN?.trim() ||
    process.env.DICTIONARY_2000NL_ACCESS_TOKEN?.trim() ||
    ''
  );
}

function b64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function sign(payload: string, tokenSecret: string) {
  return crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
}

export function canIssueAudioResolveToken() {
  return Boolean(secret());
}

export function createAudioResolveToken(input: {
  text: string;
  languageCode: string;
  purpose?: AudioResolveTokenPayload['purpose'];
}) {
  const tokenSecret = secret();
  const text = input.text.trim();
  const languageCode = input.languageCode.trim() || 'nl';
  if (!tokenSecret || !text || text.length > 160) return '';
  const payload: AudioResolveTokenPayload = {
    v: 1,
    text,
    languageCode,
    purpose: input.purpose || 'dictionary-headword',
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = b64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, tokenSecret)}`;
}

export function verifyAudioResolveToken(token: string): AudioResolveTokenPayload | null {
  const tokenSecret = secret();
  if (!tokenSecret) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = sign(encoded, tokenSecret);
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !crypto.timingSafeEqual(actual, wanted)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<AudioResolveTokenPayload>;
    if (payload.v !== 1) return null;
    if (!payload.text || typeof payload.text !== 'string') return null;
    if (!payload.languageCode || typeof payload.languageCode !== 'string') return null;
    if (payload.purpose !== 'dictionary-headword' && payload.purpose !== 'manual-dictionary-card') {
      return null;
    }
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload as AudioResolveTokenPayload;
  } catch {
    return null;
  }
}
