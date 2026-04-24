type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

const globalBuckets = globalThis as typeof globalThis & {
  __riddraRateLimitBuckets?: Map<string, RateLimitBucket>;
};

const rateLimitBuckets =
  globalBuckets.__riddraRateLimitBuckets ??
  (globalBuckets.__riddraRateLimitBuckets = new Map<string, RateLimitBucket>());

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const first = forwardedFor
      .split(",")
      .map((value) => value.trim())
      .find(Boolean);

    if (first) {
      return first;
    }
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

export function checkRequestRateLimit(
  request: Request,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();

  if (rateLimitBuckets.size > 5000) {
    pruneExpiredBuckets(now);
  }

  const key = `${options.keyPrefix}:${getClientIdentifier(request)}`;
  const current = rateLimitBuckets.get(key);
  const bucket =
    current && current.resetAt > now
      ? current
      : {
          count: 0,
          resetAt: now + options.windowMs,
        };

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  const remaining = Math.max(options.maxRequests - bucket.count, 0);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );

  return {
    allowed: bucket.count <= options.maxRequests,
    limit: options.maxRequests,
    remaining,
    retryAfterSeconds,
  };
}

export function applyRateLimitHeaders(
  response: Response,
  result: RateLimitResult,
) {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("Retry-After", String(result.retryAfterSeconds));
  return response;
}
