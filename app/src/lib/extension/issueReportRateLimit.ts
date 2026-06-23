type Bucket = {
  windowStartedAt: number;
  count: number;
};

type RateLimitState = {
  buckets: Map<string, Bucket>;
};

declare global {
  var __audioFilmsIssueReportRateLimit: RateLimitState | undefined;
}

function state(): RateLimitState {
  if (!globalThis.__audioFilmsIssueReportRateLimit) {
    globalThis.__audioFilmsIssueReportRateLimit = { buckets: new Map() };
  }
  return globalThis.__audioFilmsIssueReportRateLimit;
}

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] || '');
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function checkIssueReportRateLimit(subject: string) {
  const windowMs = numberFromEnv('ISSUE_REPORT_RATE_LIMIT_WINDOW_MS', 60 * 60 * 1000);
  const max = numberFromEnv('ISSUE_REPORT_RATE_LIMIT_MAX', 10);
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

