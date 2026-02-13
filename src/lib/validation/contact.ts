import { z } from 'zod'
import { parsePhoneNumberWithError, isValidPhoneNumber, CountryCode } from 'libphonenumber-js'

// Email validation regex (RFC 5322 simplified)
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Validation schemas for reuse
export const emailSchema = z.string()
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .regex(emailRegex, 'Invalid email format')
    .toLowerCase()
    .trim()

export function isValidEmail(email: string): boolean {
    return emailRegex.test(email)
}

// Phone validation and formatting
export function isValidPhone(phone: string, country: CountryCode = 'CH'): boolean {
    if (!phone) return true
    try {
        return isValidPhoneNumber(phone, country)
    } catch (e) {
        return false
    }
}

export function formatPhone(phone: string, country: CountryCode = 'CH'): string {
    if (!phone) return ''
    try {
        const phoneNumber = parsePhoneNumberWithError(phone, country)
        return phoneNumber.formatInternational()
    } catch (e) {
        return phone
    }
}

export function toE164(phone: string, country: CountryCode = 'CH'): string {
    if (!phone) return ''
    try {
        const phoneNumber = parsePhoneNumberWithError(phone, country)
        return phoneNumber.format('E.164')
    } catch (e) {
        return phone
    }
}
