import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRateLimiter, rateLimitResponse } from '../rate-limit'

describe('createRateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests within the limit', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 })
    expect(limiter.check('user-1').success).toBe(true)
    expect(limiter.check('user-1').success).toBe(true)
    expect(limiter.check('user-1').success).toBe(true)
  })

  it('blocks requests after the limit is exceeded', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 })
    limiter.check('user-1')
    limiter.check('user-1')
    limiter.check('user-1')
    const result = limiter.check('user-1')
    expect(result.success).toBe(false)
  })

  it('tracks remaining count correctly', () => {
    const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 })
    const r1 = limiter.check('user-1')
    expect(r1.remaining).toBe(4) // 5 - 1

    const r2 = limiter.check('user-1')
    expect(r2.remaining).toBe(3)

    const r3 = limiter.check('user-1')
    expect(r3.remaining).toBe(2)
  })

  it('returns remaining: 0 when blocked', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 })
    limiter.check('user-1')
    limiter.check('user-1')
    const blocked = limiter.check('user-1')
    expect(blocked.remaining).toBe(0)
    expect(blocked.success).toBe(false)
  })

  it('isolates counters per identifier', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 })
    limiter.check('user-1')
    limiter.check('user-1')
    limiter.check('user-1') // blocked

    // user-2 should still have a fresh window
    const r = limiter.check('user-2')
    expect(r.success).toBe(true)
    expect(r.remaining).toBe(1)
  })

  it('resets window after windowMs elapses', () => {
    vi.useFakeTimers()
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000 })

    limiter.check('user-1')
    limiter.check('user-1')
    expect(limiter.check('user-1').success).toBe(false) // blocked

    // Advance time past the window
    vi.advanceTimersByTime(1_001)

    // New window — should succeed again
    expect(limiter.check('user-1').success).toBe(true)
  })

  it('returns a resetAt timestamp in the future', () => {
    const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 })
    const before = Date.now()
    const result = limiter.check('user-1')
    expect(result.resetAt).toBeGreaterThan(before)
  })

  it('resetAt is consistent across requests in the same window', () => {
    const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 })
    const r1 = limiter.check('user-1')
    const r2 = limiter.check('user-1')
    expect(r1.resetAt).toBe(r2.resetAt)
  })

  it('allows limit of 1 (exactly one request per window)', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    expect(limiter.check('u').success).toBe(true)
    expect(limiter.check('u').success).toBe(false)
  })

  it('first request in a new window returns remaining = limit - 1', () => {
    const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 })
    const result = limiter.check('new-user')
    expect(result.remaining).toBe(9)
    expect(result.success).toBe(true)
  })
})

// ── rateLimitResponse ─────────────────────────────────────────────────────────
describe('rateLimitResponse', () => {
  it('returns a 429 response', () => {
    const resetAt = Date.now() + 30_000
    const res = rateLimitResponse(resetAt)
    expect(res.status).toBe(429)
  })

  it('includes Content-Type application/json', () => {
    const res = rateLimitResponse(Date.now() + 30_000)
    expect(res.headers.get('Content-Type')).toBe('application/json')
  })

  it('includes Retry-After header as positive integer string', () => {
    const resetAt = Date.now() + 30_000
    const res = rateLimitResponse(resetAt)
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '0', 10)
    expect(retryAfter).toBeGreaterThan(0)
    expect(retryAfter).toBeLessThanOrEqual(30)
  })

  it('includes X-RateLimit-Reset header', () => {
    const resetAt = Date.now() + 10_000
    const res = rateLimitResponse(resetAt)
    const reset = res.headers.get('X-RateLimit-Reset')
    expect(reset).toBeTruthy()
    expect(parseInt(reset!, 10)).toBeGreaterThan(0)
  })

  it('body contains error message', async () => {
    const res = rateLimitResponse(Date.now() + 5_000)
    const body = await res.json()
    expect(body.error).toBeTruthy()
    expect(body.error).toContain('Too many requests')
  })
})
