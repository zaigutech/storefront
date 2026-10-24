type RateLimitBucket = {
	count: number;
	resetAt: number;
};

type RateLimitOptions = {
	limit?: number;
	windowMs?: number;
};

const buckets = new Map<string, RateLimitBucket>();

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

/**
 * In-memory sliding-window limiter for unauthenticated lookups (order lookup).
 * Best-effort on serverless (per instance); pair with Vercel WAF for production abuse.
 */
export function checkRateLimit(
	key: string,
	{ limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS }: RateLimitOptions = {},
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
	const now = Date.now();
	const bucket = buckets.get(key);

	if (!bucket || now >= bucket.resetAt) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return { allowed: true };
	}

	if (bucket.count >= limit) {
		return {
			allowed: false,
			retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
		};
	}

	bucket.count += 1;
	return { allowed: true };
}
