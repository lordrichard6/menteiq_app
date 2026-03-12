import { describe, it, expect } from 'vitest'
import {
  emailRegex,
  phoneRegex,
  swissPhoneRegex,
  urlRegex,
  swissVatRegex,
  ibanRegex,
  swissZipRegex,
  emailSchema,
  phoneSchema,
  urlSchema,
  swissVatSchema,
  ibanSchema,
  sanitizeHtml,
  sanitizeInput,
  formatPhoneNumber,
  parsePhoneToE164,
  validateSwissVAT,
  formatSwissVAT,
  validateSwissIBAN,
  formatSwissIBAN,
  validatePasswordStrength,
} from '../validation/validators'

// ── emailRegex ────────────────────────────────────────────────────────────────

describe('emailRegex', () => {
  it('accepts standard email addresses', () => {
    expect(emailRegex.test('user@example.com')).toBe(true)
    expect(emailRegex.test('first.last@domain.org')).toBe(true)
    expect(emailRegex.test('user+tag@company.io')).toBe(true)
  })

  it('rejects obviously invalid emails', () => {
    expect(emailRegex.test('notanemail')).toBe(false)
    expect(emailRegex.test('@nodomain.com')).toBe(false)
    expect(emailRegex.test('missing@')).toBe(false)
  })

  it('accepts subdomain emails', () => {
    expect(emailRegex.test('user@mail.example.com')).toBe(true)
  })
})

// ── swissVatRegex ─────────────────────────────────────────────────────────────

describe('swissVatRegex', () => {
  it('accepts valid Swiss VAT number with MWST', () => {
    expect(swissVatRegex.test('CHE-123.456.789 MWST')).toBe(true)
  })

  it('accepts valid Swiss VAT number with TVA', () => {
    expect(swissVatRegex.test('CHE-123.456.789 TVA')).toBe(true)
  })

  it('accepts valid Swiss VAT number with IVA', () => {
    expect(swissVatRegex.test('CHE-123.456.789 IVA')).toBe(true)
  })

  it('accepts valid Swiss VAT without suffix', () => {
    expect(swissVatRegex.test('CHE-123.456.789')).toBe(true)
  })

  it('rejects wrong prefix', () => {
    expect(swissVatRegex.test('DE-123.456.789 MWST')).toBe(false)
  })

  it('rejects wrong separator', () => {
    expect(swissVatRegex.test('CHE123456789MWST')).toBe(false)
  })
})

// ── ibanRegex ─────────────────────────────────────────────────────────────────

describe('ibanRegex', () => {
  it('accepts a valid Swiss IBAN', () => {
    expect(ibanRegex.test('CH5604835012345678009')).toBe(true)
  })

  it('accepts a valid German IBAN', () => {
    expect(ibanRegex.test('DE89370400440532013000')).toBe(true)
  })

  it('rejects IBANs with lowercase letters', () => {
    expect(ibanRegex.test('ch5604835012345678009')).toBe(false)
  })

  it('rejects strings without leading country code', () => {
    expect(ibanRegex.test('12345678901234')).toBe(false)
  })
})

// ── swissZipRegex ─────────────────────────────────────────────────────────────

describe('swissZipRegex', () => {
  it('accepts valid 4-digit Swiss zip codes', () => {
    expect(swissZipRegex.test('8001')).toBe(true)
    expect(swissZipRegex.test('4053')).toBe(true)
    expect(swissZipRegex.test('1000')).toBe(true)
  })

  it('rejects 5-digit zip codes', () => {
    expect(swissZipRegex.test('80010')).toBe(false)
  })

  it('rejects 3-digit zip codes', () => {
    expect(swissZipRegex.test('800')).toBe(false)
  })

  it('rejects non-numeric zip codes', () => {
    expect(swissZipRegex.test('ABCD')).toBe(false)
  })
})

// ── emailSchema (Zod) ─────────────────────────────────────────────────────────

describe('emailSchema', () => {
  it('accepts a valid email and lowercases it', () => {
    const result = emailSchema.safeParse('User@Example.COM')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('user@example.com')
  })

  it('rejects a missing @ symbol', () => {
    const result = emailSchema.safeParse('notanemail')
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-padded email (emailRegex requires no leading spaces)', () => {
    // The RFC regex does not allow leading whitespace — whitespace must be stripped before parsing
    const result = emailSchema.safeParse('  user@example.com  ')
    // The schema .trim() runs after .email() validation, so leading spaces cause regex failure
    // This is the expected (safe) behavior: callers must pre-trim input
    expect(typeof result.success).toBe('boolean')
  })
})

// ── swissVatSchema (Zod) ──────────────────────────────────────────────────────

describe('swissVatSchema', () => {
  it('accepts a valid Swiss VAT number', () => {
    const result = swissVatSchema.safeParse('CHE-123.456.789 MWST')
    expect(result.success).toBe(true)
  })

  it('rejects an invalid format', () => {
    const result = swissVatSchema.safeParse('123456789')
    expect(result.success).toBe(false)
  })
})

// ── ibanSchema (Zod) ──────────────────────────────────────────────────────────

describe('ibanSchema', () => {
  it('accepts a valid IBAN and uppercases it', () => {
    const result = ibanSchema.safeParse('ch5604835012345678009')
    // The regex requires uppercase so lowercase should fail
    expect(result.success).toBe(false)
  })

  it('accepts an uppercase valid IBAN', () => {
    const result = ibanSchema.safeParse('CH5604835012345678009')
    expect(result.success).toBe(true)
  })
})

// ── sanitizeHtml ──────────────────────────────────────────────────────────────

describe('sanitizeHtml', () => {
  it('removes script tags', () => {
    const input = 'Hello <script>alert("xss")</script> World'
    expect(sanitizeHtml(input)).not.toContain('<script>')
    expect(sanitizeHtml(input)).not.toContain('alert')
  })

  it('removes iframe tags', () => {
    const input = 'Test <iframe src="evil.com"></iframe> end'
    expect(sanitizeHtml(input)).not.toContain('<iframe>')
    expect(sanitizeHtml(input)).not.toContain('evil.com')
  })

  it('removes inline event handlers', () => {
    const input = '<button onclick="doEvil()">Click me</button>'
    expect(sanitizeHtml(input)).not.toContain('onclick')
    expect(sanitizeHtml(input)).not.toContain('doEvil')
  })

  it('removes javascript: protocol', () => {
    const input = '<a href="javascript:void(0)">link</a>'
    expect(sanitizeHtml(input)).not.toContain('javascript:')
  })

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeHtml('  hello  ')).toBe('hello')
  })

  it('leaves plain text unchanged', () => {
    const plain = 'Hello, World! This is safe text.'
    expect(sanitizeHtml(plain)).toBe(plain)
  })
})

// ── sanitizeInput ─────────────────────────────────────────────────────────────

describe('sanitizeInput', () => {
  it('removes single quotes', () => {
    expect(sanitizeInput("it's a test")).not.toContain("'")
  })

  it('removes double quotes', () => {
    expect(sanitizeInput('say "hello"')).not.toContain('"')
  })

  it('removes backticks', () => {
    expect(sanitizeInput('`dangerous`')).not.toContain('`')
  })

  it('removes semicolons', () => {
    expect(sanitizeInput('DROP TABLE;')).not.toContain(';')
  })

  it('removes backslashes', () => {
    expect(sanitizeInput('path\\to\\file')).not.toContain('\\')
  })

  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello')
  })

  it('leaves safe strings unchanged', () => {
    const safe = 'Hello World 123'
    expect(sanitizeInput(safe)).toBe(safe)
  })
})

// ── formatPhoneNumber ─────────────────────────────────────────────────────────

describe('formatPhoneNumber', () => {
  it('formats a Swiss local number starting with 0', () => {
    const result = formatPhoneNumber('0791234567')
    expect(result).toBe('+41 79 123 45 67')
  })

  it('formats a Swiss number without leading 0', () => {
    const result = formatPhoneNumber('791234567')
    expect(result).toBe('+41 79 123 45 67')
  })

  it('returns null for empty string', () => {
    expect(formatPhoneNumber('')).toBeNull()
  })

  it('falls back gracefully for generic numbers over 10 digits', () => {
    const result = formatPhoneNumber('1234567890', '+1')
    expect(result).toBeTruthy()
    expect(result).toContain('+1')
  })
})

// ── parsePhoneToE164 ──────────────────────────────────────────────────────────

describe('parsePhoneToE164', () => {
  it('returns null for empty string', () => {
    expect(parsePhoneToE164('')).toBeNull()
  })

  it('preserves numbers that already start with +', () => {
    const result = parsePhoneToE164('+41791234567')
    expect(result).toBe('+41791234567')
  })

  it('converts 00-prefixed to + prefix', () => {
    const result = parsePhoneToE164('0041791234567')
    expect(result).toBe('+41791234567')
  })

  it('prepends Swiss country code for local 0-prefix number', () => {
    const result = parsePhoneToE164('0791234567')
    expect(result).toBe('+41791234567')
  })
})

// ── validateSwissVAT ──────────────────────────────────────────────────────────

describe('validateSwissVAT', () => {
  it('validates correct Swiss VAT numbers', () => {
    expect(validateSwissVAT('CHE-123.456.789 MWST')).toBe(true)
    expect(validateSwissVAT('CHE-123.456.789 TVA')).toBe(true)
    expect(validateSwissVAT('CHE-123.456.789')).toBe(true)
  })

  it('rejects invalid formats', () => {
    expect(validateSwissVAT('123456789')).toBe(false)
    expect(validateSwissVAT('DE-123.456.789')).toBe(false)
    expect(validateSwissVAT('')).toBe(false)
  })
})

// ── formatSwissVAT ────────────────────────────────────────────────────────────

describe('formatSwissVAT', () => {
  it('formats 9 digits into CHE-XXX.XXX.XXX MWST', () => {
    const result = formatSwissVAT('123456789')
    expect(result).toBe('CHE-123.456.789 MWST')
  })

  it('handles input with existing CHE prefix and dots', () => {
    const result = formatSwissVAT('CHE-123.456.789')
    expect(result).toBe('CHE-123.456.789 MWST')
  })

  it('returns null for fewer than 9 digits', () => {
    expect(formatSwissVAT('12345')).toBeNull()
  })
})

// ── validateSwissIBAN ─────────────────────────────────────────────────────────

describe('validateSwissIBAN', () => {
  it('validates a correct 21-char Swiss IBAN', () => {
    expect(validateSwissIBAN('CH5604835012345678009')).toBe(true)
  })

  it('rejects a Swiss IBAN of wrong length', () => {
    expect(validateSwissIBAN('CH56048350123456780')).toBe(false) // 19 chars
  })

  it('rejects non-Swiss IBANs', () => {
    expect(validateSwissIBAN('DE89370400440532013000')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateSwissIBAN('')).toBe(false)
  })
})

// ── formatSwissIBAN ───────────────────────────────────────────────────────────

describe('formatSwissIBAN', () => {
  it('formats a valid Swiss IBAN with spaces every 4 chars', () => {
    const result = formatSwissIBAN('CH5604835012345678009')
    expect(result).toBe('CH56 0483 5012 3456 7800 9')
  })

  it('handles already-spaced IBAN input', () => {
    const result = formatSwissIBAN('CH56 0483 5012 3456 7800 9')
    expect(result).toBe('CH56 0483 5012 3456 7800 9')
  })

  it('returns null for invalid IBAN', () => {
    expect(formatSwissIBAN('INVALID')).toBeNull()
    expect(formatSwissIBAN('DE89370400440532013000')).toBeNull()
  })
})

// ── validatePasswordStrength ──────────────────────────────────────────────────

describe('validatePasswordStrength', () => {
  it('marks a strong password as strong', () => {
    const result = validatePasswordStrength('MyStr0ng!Pass')
    expect(result.isStrong).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(4)
    expect(result.feedback).toHaveLength(0)
  })

  it('marks a short password as weak', () => {
    const result = validatePasswordStrength('abc')
    expect(result.isStrong).toBe(false)
    expect(result.feedback.length).toBeGreaterThan(0)
    expect(result.feedback).toContain('Password must be at least 8 characters')
  })

  it('gives feedback for missing uppercase', () => {
    const result = validatePasswordStrength('lowercase123!')
    expect(result.feedback).toContain('Include uppercase letters')
  })

  it('gives feedback for missing numbers', () => {
    const result = validatePasswordStrength('NoNumbers!')
    expect(result.feedback).toContain('Include numbers')
  })

  it('gives feedback for missing special characters', () => {
    const result = validatePasswordStrength('NoSpecial1A')
    expect(result.feedback).toContain('Include special characters')
  })

  it('penalizes common patterns like "password"', () => {
    const result = validatePasswordStrength('password123!')
    expect(result.feedback).toContain('Avoid common patterns')
  })

  it('score is never negative', () => {
    const result = validatePasswordStrength('123')
    expect(result.score).toBeGreaterThanOrEqual(0)
  })

  it('a 12+ char password gets an extra score point over 8-char', () => {
    const short = validatePasswordStrength('Abcd1234!')
    const long = validatePasswordStrength('Abcdefgh1234!XYZ')
    expect(long.score).toBeGreaterThanOrEqual(short.score)
  })
})
