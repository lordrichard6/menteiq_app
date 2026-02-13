import { z } from 'zod'
import { ContactStatus } from '@/types/contact'
import { emailRegex, isValidPhone } from './contact'



// Import contact schema
export const importContactSchema = z.object({
  firstName: z.string()
    .min(1, 'First Name is required')
    .max(200, 'First Name must be less than 200 characters')
    .trim(),

  lastName: z.string()
    .max(200, 'Last Name must be less than 200 characters')
    .optional()
    .nullable()
    .transform(val => val || ''),

  companyName: z.string()
    .max(200, 'Company name must be less than 200 characters')
    .optional()
    .nullable()
    .transform(val => val || null),

  email: z.string()
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .regex(emailRegex, 'Invalid email format')
    .toLowerCase()
    .trim(),

  phone: z.string()
    .max(50, 'Phone must be less than 50 characters')
    .optional()
    .nullable()
    .transform(val => (val && val.trim() !== '') ? val.trim() : null)
    .refine(val => val === null || isValidPhone(val), 'Invalid phone format'),


  status: z.enum(['lead', 'opportunity', 'client', 'churned'])
    .default('lead')
    .catch('lead'), // If invalid, default to 'lead'

  tags: z.string()
    .optional()
    .nullable()
    .transform(val => {
      if (!val) return []
      // Split by comma, semicolon, or pipe
      return val.split(/[,;|]/).map(tag => tag.trim()).filter(Boolean)
    }),
})

export type ImportContactInput = z.infer<typeof importContactSchema>

// Batch validation result
export interface ValidationResult {
  valid: ImportContactInput[]
  invalid: {
    row: number
    data: any
    errors: z.ZodError
  }[]
  duplicates: {
    row: number
    email: string
    existingContactId?: string
  }[]
}

// Validate a batch of contacts
export function validateContacts(
  contacts: any[],
  existingEmails: Set<string> = new Set()
): ValidationResult {
  const result: ValidationResult = {
    valid: [],
    invalid: [],
    duplicates: []
  }

  const seenEmails = new Set<string>()

  contacts.forEach((contact, index) => {
    try {
      // Validate with Zod
      const validContact = importContactSchema.parse(contact)

      // Check for duplicates in the batch
      const email = validContact.email.toLowerCase()
      if (seenEmails.has(email)) {
        result.duplicates.push({
          row: index + 1,
          email: validContact.email,
        })
      } else if (existingEmails.has(email)) {
        // Check for duplicates in existing database
        result.duplicates.push({
          row: index + 1,
          email: validContact.email,
        })
      } else {
        seenEmails.add(email)
        result.valid.push(validContact)
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        result.invalid.push({
          row: index + 1,
          data: contact,
          errors: error
        })
      }
    }
  })

  return result
}

// Format validation errors for display
export function formatValidationErrors(error: z.ZodError): string[] {
  return error.issues.map(err => {
    const field = err.path.join('.')
    return `${field}: ${err.message}`
  })
}
