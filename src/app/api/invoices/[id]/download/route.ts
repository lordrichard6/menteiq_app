import { createClient } from '@/lib/supabase/server'
import { generateInvoicePDF } from '@/lib/invoices/pdf-generator'
import { NextResponse } from 'next/server'
import type { InvoiceWithLineItems } from '@/lib/services/invoice-service'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const preview = searchParams.get('preview') === 'true'
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

        // Sanitize filename — remove characters not safe in Content-Disposition
        const safeFilename = invoice.invoice_number.replace(/[^a-zA-Z0-9\-_.]/g, '_')

        return new Response(pdfBuffer as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': preview
                    ? `inline; filename="${safeFilename}.pdf"`
                    : `attachment; filename="${safeFilename}.pdf"`,
            },
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to generate PDF'
        return new Response(message, { status: 500 })
    }
}
