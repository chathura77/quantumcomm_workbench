type RateLimitBucket = {
  count: number;
  resetAtMs: number;
};

type RateLimitState = {
  buckets: Map<string, RateLimitBucket>;
};

export type RateLimitOptions = {
  routeId: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult =
  | {
    ok: true;
    remaining: number;
    resetAt: string;
  }
  | {
    ok: false;
    retryAfterSeconds: number;
    resetAt: string;
  };

const globalForRateLimit = globalThis as typeof globalThis & {
  __quantumCommRateLimit?: RateLimitState;
};

function getRateLimitState(): RateLimitState {
  if (!globalForRateLimit.__quantumCommRateLimit) {
    globalForRateLimit.__quantumCommRateLimit = { buckets: new Map() };
  }
  return globalForRateLimit.__quantumCommRateLimit;
}

export function clientFingerprint(request?: Request): string {
  if (!request) return "test-harness";
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();
  return forwardedFor || realIp || cfConnectingIp || "unknown-client";
}

export function checkRateLimit(clientId: string, options: RateLimitOptions): RateLimitResult {
  const state = getRateLimitState();
  const now = Date.now();
  const key = `${options.routeId}:${clientId}`;
  const current = state.buckets.get(key);

  if (!current || current.resetAtMs <= now) {
    const resetAtMs = now + options.windowMs;
    state.buckets.set(key, { count: 1, resetAtMs });
    return {
      ok: true,
      remaining: Math.max(0, options.limit - 1),
      resetAt: new Date(resetAtMs).toISOString()
    };
  }

  if (current.count >= options.limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAtMs - now) / 1000)),
      resetAt: new Date(current.resetAtMs).toISOString()
    };
  }

  current.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, options.limit - current.count),
    resetAt: new Date(current.resetAtMs).toISOString()
  };
}

export function __resetRateLimitForTests() {
  globalForRateLimit.__quantumCommRateLimit = undefined;
}
