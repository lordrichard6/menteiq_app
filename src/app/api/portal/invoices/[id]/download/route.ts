/**
 * GET /api/portal/invoices/[id]/download
 * Download invoice PDF from client portal
 * Uses portal session authentication (not Supabase auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInvoicePDF } from '@/lib/invoices/pdf-generator';
import type { InvoiceWithLineItems } from '@/stores/invoice-store';
import { getPortalSession } from '@/lib/portal/session';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const invoiceId = params.id;

    // Get portal session (verify client is authenticated)
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Portal session required' },
        { status: 401 }
      );
    }

    // Fetch invoice with contact and line items
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(
        `
        *,
        contacts (
            id, name, email, phone, company,
            address_line1, address_line2, city, state, postal_code, country
        )
    `
      )
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Security check: Verify invoice belongs to this portal contact
    if (invoice.contact_id !== session.contact_id) {
      return NextResponse.json(
        { error: 'Unauthorized - This invoice does not belong to you' },
        { status: 403 }
      );
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true });

    const fullInvoice: InvoiceWithLineItems = {
      ...invoice,
      contact: invoice.contacts,
      line_items: lineItems || [],
    };

    // Fetch organization settings for branding/IBAN
    const { data: org } = await supabase
      .from('organizations')
      .select('settings, name')
      .eq('id', invoice.tenant_id)
      .single();

    const settings = (org?.settings as any) || {};

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(fullInvoice, settings);

    // Return PDF
    return new Response(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoice_number || invoiceId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Portal invoice download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
