/**
 * Shared invoice totals calculation utility.
 * Pure function — no server or client Supabase imports.
 * Used by: invoice-store (client), create-invoice-dialog (client), invoice-service (server)
 */

export interface LineItemLike {
    quantity: number
    unit_price: number
    tax_rate: number
}

export interface CalculatedTotals {
    subtotal: number
    tax_total: number
    amount_total: number
}

/**
 * Calculate subtotal, VAT, and grand total from an array of line items.
 * All values are rounded to 2 decimal places.
 */
export function calculateTotals(lineItems: LineItemLike[]): CalculatedTotals {
    let subtotal = 0
    let tax_total = 0

    for (const item of lineItems) {
        const lineTotal = item.quantity * item.unit_price
        const lineTax = lineTotal * (item.tax_rate / 100)
        subtotal += lineTotal
        tax_total += lineTax
    }

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        tax_total: Math.round(tax_total * 100) / 100,
        amount_total: Math.round((subtotal + tax_total) * 100) / 100,
    }
}
