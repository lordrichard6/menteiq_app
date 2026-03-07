import { createClient } from '@/lib/supabase/server'
import { generateInvoicePDF } from '@/lib/invoices/pdf-generator'
import type { InvoiceWithLineItems } from '@/lib/services/invoice-service'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch invoice with full contact address for PDF generation
    const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
            *,
            contacts (
                id, first_name, last_name, company_name, is_company, email,
                phone, address_line1, address_line2, city, state, postal_code, country
            )
        `)
        .eq('id', id)
        .single()

    if (error || !invoice) {
        return new Response('Invoice not found', { status: 404 })
    }

    // Fetch line items
    const { data: lineItems } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order', { ascending: true })

    const fullInvoice: InvoiceWithLineItems = {
        ...invoice,
        contact: invoice.contacts as InvoiceWithLineItems['contact'],
        line_items: lineItems || [],
    }

    // Fetch org settings for branding / IBAN
    const { data: org } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', invoice.tenant_id)
        .single()

    const settings = (org?.settings as Record<string, unknown>) || {}

    try {
        const pdfBuffer = await generateInvoicePDF(fullInvoice, settings)

        return new Response(pdfBuffer as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
            },
        })
    } catch (err) {
        console.error('PDF Generation Error:', err)
        return new Response('Failed to generate PDF', { status: 500 })
    }
}
