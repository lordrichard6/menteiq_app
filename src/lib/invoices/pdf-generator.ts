/**
 * Invoice PDF Generator
 *
 * Routes to the correct PDF service based on invoice type:
 * - swiss_qr  → SwissInvoiceService (swissqrbill library with A6 QR slip)
 * - eu_sepa   → EUInvoiceService (standard SEPA layout with IBAN/BIC section)
 */

import { SwissInvoiceService } from '@/lib/swiss/qr-invoice'
import { EUInvoiceService } from '@/lib/invoices/eu-invoice'
import type { InvoiceWithLineItems } from '@/lib/services/invoice-service'

export async function generateInvoicePDF(
    invoice: InvoiceWithLineItems,
    settings: Record<string, unknown>
): Promise<Buffer> {
    const billing = (settings.billing as Record<string, unknown>) || {}

    // Creditor info from org settings
    const creditorName    = (billing.company_name  as string | undefined) || 'My Company'
    const creditorAddress = (billing.address_line1 as string | undefined) || 'My Address'
    const creditorZip     = (billing.postal_code   as string | undefined) || '1000'
    const creditorCity    = (billing.city          as string | undefined) || 'Zurich'
    const creditorCountry = (billing.country       as string | undefined) || 'CH'
    const creditorAccount = ((billing.iban          as string | undefined) || '').replace(/\s/g, '')
    const creditorVat     = billing.vat_number as string | undefined
    const creditorEmail   = billing.email      as string | undefined
    const creditorPhone   = billing.phone      as string | undefined
    const creditorBic     = billing.bic        as string | undefined
    const creditorBank    = billing.bank_name  as string | undefined

    // Debtor info from contact (full address fields fetched by download routes)
    const contact    = invoice.contact
    const clientName = contact?.is_company
        ? contact.company_name || 'Valued Client'
        : `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 'Valued Client'

    const debtor = {
        name:    clientName,
        address: contact?.address_line1 || 'Unknown Address',
        zip:     contact?.postal_code   || '0000',
        city:    contact?.city          || 'Unknown City',
        country: contact?.country       || 'CH',
    }

    // Route to correct service
    if (invoice.invoice_type === 'swiss_qr') {
        return SwissInvoiceService.generatePDF({
            invoice_number: invoice.invoice_number,
            invoice_date:   invoice.invoice_date || new Date().toISOString().split('T')[0],
            due_date:       invoice.due_date     || new Date().toISOString().split('T')[0],
            amount:         invoice.amount_total,
            currency:       invoice.currency as 'CHF' | 'EUR',
            creditor: {
                name:       creditorName,
                address:    creditorAddress,
                zip:        creditorZip,
                city:       creditorCity,
                country:    creditorCountry,
                account:    creditorAccount,
                vat_number: creditorVat,
                email:      creditorEmail,
                phone:      creditorPhone,
            },
            debtor,
            reference:  invoice.qr_reference || '',
            line_items: invoice.line_items,
            subtotal:   invoice.subtotal  ?? undefined,
            tax_total:  invoice.tax_total ?? undefined,
            notes:      invoice.notes     ?? undefined,
        })
    }

    // EU SEPA
    return EUInvoiceService.generatePDF({
        invoice_number: invoice.invoice_number,
        invoice_date:   invoice.invoice_date || new Date().toISOString().split('T')[0],
        due_date:       invoice.due_date     || new Date().toISOString().split('T')[0],
        currency:       invoice.currency,
        creditor: {
            company_name: creditorName,
            address:      creditorAddress,
            zip:          creditorZip,
            city:         creditorCity,
            country:      creditorCountry,
            vat_number:   creditorVat,
            iban:         creditorAccount,
            bic:          creditorBic,
            bank_name:    creditorBank,
            email:        creditorEmail,
            phone:        creditorPhone,
        },
        debtor,
        line_items:   invoice.line_items,
        subtotal:     invoice.subtotal  ?? 0,
        tax_total:    invoice.tax_total ?? 0,
        amount_total: invoice.amount_total,
        notes:        invoice.notes ?? undefined,
    })
}
