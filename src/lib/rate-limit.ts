/**
 * In-memory rate limiter — no external dependencies required.
 *
 * Uses a sliding-window algorithm keyed on an identifier (e.g. user ID or IP).
 * Works on Vercel Node.js runtime (serverless functions share memory within the
 * same instance; for true global rate limiting across instances use Upstash Redis).
 *
 * Usage:
 *   const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
 *   const result = limiter.check('user-id');
 *   if (!result.success) return new Response('Too Many Requests', { status: 429 });
 */

interface RateLimitOptions {
  /** Max number of requests allowed per window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  /** How many requests remain in the current window */
  remaining: number;
  /** Timestamp (ms) when the window resets */
  resetAt: number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter({ limit, windowMs }: RateLimitOptions) {
  const store = new Map<string, WindowEntry>();

  // Periodically clean up expired entries to avoid memory leaks
  // Only in server environments (not during build/test)
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (now > entry.resetAt) store.delete(key);
      }
    }, windowMs * 2);
  }

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(identifier);

      if (!entry || now > entry.resetAt) {
        // New window
        const resetAt = now + windowMs;
        store.set(identifier, { count: 1, resetAt });
        return { success: true, remaining: limit - 1, resetAt };
      }

      if (entry.count >= limit) {
        return { success: false, remaining: 0, resetAt: entry.resetAt };
      }

      entry.count += 1;
      return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
    },
  };
}

/**
 * Pre-configured limiters for specific routes.
 *
 * /api/chat        — 20 requests per minute per user (AI calls are expensive)
 * /api/portal/invite — 5 invitations per 10 minutes per user (email abuse prevention)
 */
export const chatLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
export const inviteLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

/**
 * Build a standardised 429 response with Retry-After header.
 */
export function rateLimitResponse(resetAt: number): Response {
  const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}
