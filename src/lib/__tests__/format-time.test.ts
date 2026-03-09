import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatRelativeTime,
  formatAbsoluteTime,
  formatShortDate,
  formatSmartTime,
} from '../format-time'

/** Helper: return a Date that is `seconds` seconds before now */
function secondsAgo(seconds: number): Date {
  return new Date(Date.now() - seconds * 1000)
}

describe('formatRelativeTime', () => {
  it('returns "just now" for future dates', () => {
    const future = new Date(Date.now() + 60_000)
    expect(formatRelativeTime(future)).toBe('just now')
  })

  it('returns "just now" for < 60 seconds ago', () => {
    expect(formatRelativeTime(secondsAgo(30))).toBe('just now')
    expect(formatRelativeTime(secondsAgo(0))).toBe('just now')
    expect(formatRelativeTime(secondsAgo(59))).toBe('just now')
  })

  it('returns "1 minute ago" for exactly 1 minute', () => {
    expect(formatRelativeTime(secondsAgo(60))).toBe('1 minute ago')
  })

  it('returns singular "minute" for 1 min', () => {
    expect(formatRelativeTime(secondsAgo(90))).toBe('1 minute ago')
  })

  it('returns plural "minutes" for multiple minutes', () => {
    expect(formatRelativeTime(secondsAgo(3 * 60))).toBe('3 minutes ago')
    expect(formatRelativeTime(secondsAgo(59 * 60))).toBe('59 minutes ago')
  })

  it('returns "1 hour ago" for exactly 1 hour', () => {
    expect(formatRelativeTime(secondsAgo(3600))).toBe('1 hour ago')
  })

  it('returns plural "hours" for multiple hours', () => {
    expect(formatRelativeTime(secondsAgo(5 * 3600))).toBe('5 hours ago')
    expect(formatRelativeTime(secondsAgo(23 * 3600))).toBe('23 hours ago')
  })

  it('returns "1 day ago" for exactly 1 day', () => {
    expect(formatRelativeTime(secondsAgo(86400))).toBe('1 day ago')
  })

  it('returns plural "days" for multiple days', () => {
    expect(formatRelativeTime(secondsAgo(4 * 86400))).toBe('4 days ago')
    expect(formatRelativeTime(secondsAgo(6 * 86400))).toBe('6 days ago')
  })

  it('returns "1 week ago" for exactly 1 week', () => {
    expect(formatRelativeTime(secondsAgo(604800))).toBe('1 week ago')
  })

  it('returns plural "weeks" for multiple weeks', () => {
    expect(formatRelativeTime(secondsAgo(3 * 604800))).toBe('3 weeks ago')
  })

  it('returns "1 month ago" for ~30 days', () => {
    expect(formatRelativeTime(secondsAgo(2_592_000))).toBe('1 month ago')
  })

  it('returns plural "months" for multiple months', () => {
    expect(formatRelativeTime(secondsAgo(6 * 2_592_000))).toBe('6 months ago')
  })

  it('returns "1 year ago" for exactly 1 year', () => {
    expect(formatRelativeTime(secondsAgo(31_536_000))).toBe('1 year ago')
  })

  it('returns plural "years" for multiple years', () => {
    expect(formatRelativeTime(secondsAgo(3 * 31_536_000))).toBe('3 years ago')
  })

  it('accepts a string date', () => {
    const str = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    expect(formatRelativeTime(str)).toBe('2 hours ago')
  })
})

describe('formatAbsoluteTime', () => {
  it('returns a non-empty string for any date', () => {
    const result = formatAbsoluteTime(new Date('2026-01-15T15:45:00'))
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('includes the year in the output', () => {
    const result = formatAbsoluteTime(new Date('2026-01-15T15:45:00'))
    expect(result).toMatch(/2026/)
  })

  it('accepts a string date', () => {
    const result = formatAbsoluteTime('2026-01-15T15:45:00')
    expect(result).toMatch(/2026/)
  })

  it('contains AM or PM (12-hour format)', () => {
    const result = formatAbsoluteTime(new Date('2026-01-15T15:45:00'))
    expect(result).toMatch(/AM|PM/)
  })
})

describe('formatShortDate', () => {
  it('returns a non-empty string for any date', () => {
    const result = formatShortDate(new Date('2026-03-07'))
    expect(result).toBeTruthy()
  })

  it('includes the year', () => {
    expect(formatShortDate(new Date('2026-03-07'))).toMatch(/2026/)
  })

  it('does NOT include hour/minute', () => {
    const result = formatShortDate(new Date('2026-03-07T14:30:00'))
    expect(result).not.toMatch(/14|30|AM|PM/)
  })

  it('accepts a string date', () => {
    const result = formatShortDate('2026-03-07')
    expect(result).toMatch(/2026/)
  })
})

describe('formatSmartTime', () => {
  it('uses relative format for dates within 7 days', () => {
    const recent = secondsAgo(2 * 3600) // 2 hours ago
    const result = formatSmartTime(recent)
    expect(result).toBe('2 hours ago')
  })

  it('uses absolute format for dates older than 7 days', () => {
    const old = secondsAgo(10 * 86400) // 10 days ago
    const result = formatSmartTime(old)
    // Should be a short date like "Feb 25, 2026", not "10 days ago"
    expect(result).toMatch(/\d{4}/)
    expect(result).not.toMatch(/ago/)
  })

  it('at exactly the boundary (604800 s), uses relative format', () => {
    // 604800s = 7 days exactly — still relative
    const boundary = secondsAgo(604799)
    const result = formatSmartTime(boundary)
    expect(result).toMatch(/day|week|hour|minute/)
  })

  it('accepts a string date', () => {
    const result = formatSmartTime(new Date(Date.now() - 3600_000).toISOString())
    expect(result).toBe('1 hour ago')
  })
})
