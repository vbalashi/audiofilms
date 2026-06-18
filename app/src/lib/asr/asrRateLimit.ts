type Bucket = {
  windowStartedAt: number;
  count: number;
};

type GlobalRateLimitState = {
  buckets: Map<string, Bucket>;
};

declare global {
  var __audioFilmsAsrRateLimit: GlobalRateLimitState | undefined;
}

function state(): GlobalRateLimitState {
  if (!globalThis.__audioFilmsAsrRateLimit) {
    globalThis.__audioFilmsAsrRateLimit = { buckets: new Map() };
  }
  return globalThis.__audioFilmsAsrRateLimit;
}

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] || '');
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function checkAsrJobCreationRateLimit(subject: string) {
  const windowMs = numberFromEnv('ASR_RATE_LIMIT_WINDOW_MS', 60 * 60 * 1000);
  const max = numberFromEnv('ASR_RATE_LIMIT_MAX', 4);
  const now = Date.now();
  const buckets = state().buckets;
  const bucket = buckets.get(subject);

  if (!bucket || now - bucket.windowStartedAt >= windowMs) {
    buckets.set(subject, { windowStartedAt: now, count: 1 });
    return { ok: true as const, remaining: Math.max(0, max - 1), retryAfterMs: 0 };
  }

  if (bucket.count >= max) {
    return {
      ok: false as const,
      remaining: 0,
      retryAfterMs: Math.max(1, windowMs - (now - bucket.windowStartedAt)),
    };
  }

  bucket.count += 1;
  return { ok: true as const, remaining: Math.max(0, max - bucket.count), retryAfterMs: 0 };
}
