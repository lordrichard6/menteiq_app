/**
 * Typed interface for organization billing settings.
 * Stored in organizations.settings.billing (JSON column).
 *
 * ⚠️  Field names MUST match what pdf-generator.ts reads:
 *     address_line1, address_line2, postal_code, city, country
 *     (NOT "address", "zip" — those were a legacy mismatch that broke PDFs)
 */

export interface BillingSettings {
    company_name?: string
    address_line1?: string
    address_line2?: string
    postal_code?: string
    city?: string
    country?: string
    iban?: string
    bic?: string
    bank_name?: string
    vat_number?: string
    email?: string
    phone?: string
    invoice_prefix?: string
    default_currency?: string
    default_tax_rate?: number
}

export interface OrgSettings {
    billing?: BillingSettings
    [key: string]: unknown
}

/**
 * Safely extract billing settings from a raw org settings object.
 *
 * Handles backward-compatible migration of legacy field names:
 *   address → address_line1
 *   zip     → postal_code
 */
export function getBillingSettings(settings: Record<string, unknown>): BillingSettings {
    const raw = (settings.billing as Record<string, unknown>) ?? {}

    // Migrate legacy field names (settings page previously used "address" / "zip")
    const billing: BillingSettings = { ...(raw as BillingSettings) }
    if (!billing.address_line1 && raw.address) {
        billing.address_line1 = raw.address as string
    }
    if (!billing.postal_code && raw.zip) {
        billing.postal_code = raw.zip as string
    }

    return billing
}
