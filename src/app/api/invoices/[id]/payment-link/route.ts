/**
 * Invoice Payment Link API
 * 
 * POST /api/invoices/:id/payment-link
 * Creates a Stripe payment link for the invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StripeService } from '@/lib/services/stripe-service';
import { InvoiceService } from '@/lib/services/invoice-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;
    
    // Check if Stripe is configured
    if (!StripeService.isConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.' },
        { status: 503 }
      );
    }

    // Get the invoice
    const supabase = await createClient();
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice can receive payment
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      );
    }

    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Invoice is cancelled' },
        { status: 400 }
      );
    }

    // Check if we already have a payment link
    if (invoice.stripe_payment_link) {
      return NextResponse.json({
        payment_link: invoice.stripe_payment_link,
        cached: true,
      });
    }

    // Create new payment link
    const paymentLink = await StripeService.createPaymentLink(invoice);

    // Save the payment link to the invoice
    await InvoiceService.setPaymentLink(invoiceId, paymentLink);

    return NextResponse.json({
      payment_link: paymentLink,
      cached: false,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create payment link'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;
    
    // Get the invoice's existing payment link
    const supabase = await createClient();
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('stripe_payment_link, status')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (!invoice.stripe_payment_link) {
      return NextResponse.json(
        { error: 'No payment link exists for this invoice' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      payment_link: invoice.stripe_payment_link,
      status: invoice.status,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get payment link'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
