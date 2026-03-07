/**
 * Typed interface for organization billing settings.
 * Stored in organizations.settings.billing (JSON column).
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
}

export interface OrgSettings {
    billing?: BillingSettings
    [key: string]: unknown
}

/**
 * Safely extract billing settings from a raw org settings object.
 */
export function getBillingSettings(settings: Record<string, unknown>): BillingSettings {
    return (settings.billing as BillingSettings) ?? {}
}
