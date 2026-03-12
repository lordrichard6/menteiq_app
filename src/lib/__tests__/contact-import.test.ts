import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  importContactSchema,
  validateContacts,
  formatValidationErrors,
} from '../validation/contact-import'

// ── importContactSchema ───────────────────────────────────────────────────────

describe('importContactSchema — valid inputs', () => {
  const validContact = {
    firstName: 'Anna',
    lastName: 'Müller',
    email: 'anna.mueller@example.com',
    status: 'client' as const,
  }

  it('parses a minimal valid contact', () => {
    const result = importContactSchema.safeParse(validContact)
    expect(result.success).toBe(true)
  })

  it('lowercases email addresses', () => {
    const result = importContactSchema.safeParse({ ...validContact, email: 'ANNA@EXAMPLE.COM' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('anna@example.com')
  })

  it('trims whitespace from firstName', () => {
    const result = importContactSchema.safeParse({ ...validContact, firstName: '  Anna  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.firstName).toBe('Anna')
  })

  it('defaults status to "lead" when omitted', () => {
    const { status: _s, ...withoutStatus } = validContact as typeof validContact & { status?: string }
    const result = importContactSchema.safeParse(withoutStatus)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('lead')
  })

  it('falls back to "lead" for invalid status values', () => {
    const result = importContactSchema.safeParse({ ...validContact, status: 'invalid_status' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('lead')
  })

  it('parses tags from comma-separated string', () => {
    const result = importContactSchema.safeParse({ ...validContact, tags: 'vip, enterprise, tech' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual(['vip', 'enterprise', 'tech'])
    }
  })

  it('parses tags separated by semicolon', () => {
    const result = importContactSchema.safeParse({ ...validContact, tags: 'one;two;three' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toContain('one')
      expect(result.data.tags).toContain('two')
      expect(result.data.tags).toContain('three')
    }
  })

  it('parses tags separated by pipe', () => {
    const result = importContactSchema.safeParse({ ...validContact, tags: 'design|ux' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual(['design', 'ux'])
    }
  })

  it('returns empty array when tags is null', () => {
    const result = importContactSchema.safeParse({ ...validContact, tags: null })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.tags).toEqual([])
  })

  it('coerces null lastName to empty string', () => {
    const result = importContactSchema.safeParse({ ...validContact, lastName: null })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.lastName).toBe('')
  })

  it('coerces null companyName to null', () => {
    const result = importContactSchema.safeParse({ ...validContact, companyName: null })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.companyName).toBeNull()
  })
})

describe('importContactSchema — invalid inputs', () => {
  const validBase = {
    firstName: 'Anna',
    email: 'anna@example.com',
  }

  it('rejects missing firstName', () => {
    const result = importContactSchema.safeParse({ email: 'anna@example.com' })
    expect(result.success).toBe(false)
  })

  it('rejects empty firstName', () => {
    const result = importContactSchema.safeParse({ ...validBase, firstName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    const result = importContactSchema.safeParse({ firstName: 'Anna' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email format', () => {
    const result = importContactSchema.safeParse({ ...validBase, email: 'notanemail' })
    expect(result.success).toBe(false)
  })

  it('rejects firstName over 200 characters', () => {
    const result = importContactSchema.safeParse({ ...validBase, firstName: 'A'.repeat(201) })
    expect(result.success).toBe(false)
  })
})

// ── validateContacts ──────────────────────────────────────────────────────────

describe('validateContacts', () => {
  const validRow = { firstName: 'Anna', email: 'anna@example.com', status: 'lead' }
  const validRow2 = { firstName: 'Bob', email: 'bob@example.com', status: 'client' }

  it('validates a single valid contact', () => {
    const result = validateContacts([validRow])
    expect(result.valid).toHaveLength(1)
    expect(result.invalid).toHaveLength(0)
    expect(result.duplicates).toHaveLength(0)
  })

  it('validates multiple valid contacts', () => {
    const result = validateContacts([validRow, validRow2])
    expect(result.valid).toHaveLength(2)
    expect(result.invalid).toHaveLength(0)
  })

  it('catches contacts with invalid email', () => {
    const bad = { firstName: 'Bad', email: 'not-an-email', status: 'lead' }
    const result = validateContacts([validRow, bad])
    expect(result.valid).toHaveLength(1)
    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0].row).toBe(2) // 1-indexed
  })

  it('catches contacts with missing firstName', () => {
    const bad = { email: 'noname@example.com' }
    const result = validateContacts([bad])
    expect(result.invalid).toHaveLength(1)
  })

  it('detects duplicates within the batch', () => {
    const duplicate = { firstName: 'Clone', email: 'anna@example.com', status: 'lead' }
    const result = validateContacts([validRow, duplicate])
    expect(result.valid).toHaveLength(1) // first occurrence
    expect(result.duplicates).toHaveLength(1)
    expect(result.duplicates[0].email).toBe('anna@example.com')
  })

  it('detects duplicates against existing emails set', () => {
    const existingEmails = new Set(['anna@example.com'])
    const result = validateContacts([validRow], existingEmails)
    expect(result.duplicates).toHaveLength(1)
    expect(result.valid).toHaveLength(0)
  })

  it('is case-insensitive for duplicate detection', () => {
    const upperCase = { firstName: 'Anna', email: 'ANNA@EXAMPLE.COM', status: 'lead' }
    const result = validateContacts([validRow, upperCase])
    // Both parse to same lowercase email, so second is a duplicate
    expect(result.duplicates).toHaveLength(1)
  })

  it('returns empty result for empty input', () => {
    const result = validateContacts([])
    expect(result.valid).toHaveLength(0)
    expect(result.invalid).toHaveLength(0)
    expect(result.duplicates).toHaveLength(0)
  })

  it('returns correct row numbers (1-indexed)', () => {
    const bad = { email: 'bad' }
    const result = validateContacts([validRow, bad])
    expect(result.invalid[0].row).toBe(2)
  })
})

// ── formatValidationErrors ────────────────────────────────────────────────────

describe('formatValidationErrors', () => {
  it('returns an array of field: message strings', () => {
    const parseResult = importContactSchema.safeParse({ email: 'bad' })
    expect(parseResult.success).toBe(false)
    if (!parseResult.success) {
      const msgs = formatValidationErrors(parseResult.error)
      expect(Array.isArray(msgs)).toBe(true)
      expect(msgs.length).toBeGreaterThan(0)
      // Each message should contain a colon separating field from message
      for (const msg of msgs) {
        expect(msg).toContain(':')
      }
    }
  })

  it('includes the field name in the message', () => {
    const parseResult = importContactSchema.safeParse({ firstName: '', email: 'a@b.com' })
    expect(parseResult.success).toBe(false)
    if (!parseResult.success) {
      const msgs = formatValidationErrors(parseResult.error)
      // Should mention the failing field
      expect(msgs.some(m => m.includes('firstName'))).toBe(true)
    }
  })

  it('returns empty array for a ZodError with no issues', () => {
    // Manually construct a ZodError with no issues
    const emptyError = new z.ZodError([])
    const msgs = formatValidationErrors(emptyError)
    expect(msgs).toHaveLength(0)
  })
})
