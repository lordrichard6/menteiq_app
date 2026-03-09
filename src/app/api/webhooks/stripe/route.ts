/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for payment processing.
 *
 * Events handled:
 * - checkout.session.completed: Mark invoice as paid
 * - checkout.session.expired: Payment link expired (optional handling)
 *
 * SETUP:
 * 1. Configure webhook endpoint in Stripe Dashboard
 * 2. Set STRIPE_WEBHOOK_SECRET in .env.local
 * 3. For local testing: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { StripeService } from '@/lib/services/stripe-service';
import { InvoiceService } from '@/lib/services/invoice-service';
import { createClient } from '@supabase/supabase-js';

// Admin client for webhook handlers (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!StripeService.isConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Get the raw body for signature verification
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify the webhook signature
    let event;
    try {
      event = await StripeService.verifyWebhookSignature(payload, signature);
    } catch (err: unknown) {
      Sentry.captureException(err, { extra: { context: 'stripe-webhook-signature-verification' } });
      return NextResponse.json(
        { error: `Webhook Error: ${err instanceof Error ? err.message : String(err)}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Extract invoice ID from metadata
        const invoiceId = session.metadata?.invoice_id;

        if (!invoiceId) {
          Sentry.addBreadcrumb({
            category: 'stripe',
            message: 'Checkout session completed without invoice_id in metadata',
            level: 'warning',
            data: { sessionId: session.id },
          });
          break;
        }

        // Mark the invoice as paid
        try {
          await InvoiceService.markAsPaid(invoiceId, session.id);
        } catch (error) {
          Sentry.captureException(error, { extra: { invoiceId, sessionId: session.id } });
          // Don't return error - Stripe will retry on 5xx
        }

        break;
      }

      case 'checkout.session.expired': {
        // Optional: Handle expired sessions
        const session = event.data.object;
        const invoiceId = session.metadata?.invoice_id;

        if (invoiceId) {
          // Could update invoice status or send notification
        }

        break;
      }

      case 'payment_intent.succeeded': {
        // Payment intent succeeded — no action required; checkout.session.completed handles invoice update
        break;
      }

      case 'payment_intent.payment_failed': {
        // Payment failed on a one-time invoice payment — log for future email notification
        const intent = event.data.object as { metadata?: { invoice_id?: string } };
        const failedInvoiceId = intent.metadata?.invoice_id;
        if (failedInvoiceId) {
          await supabaseAdmin
            .from('invoices')
            .update({ status: 'overdue' })
            .eq('id', failedInvoiceId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as unknown as {
          id: string;
          status: string;
          current_period_end: number;
          metadata?: { plan?: string };
        };
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            ...(sub.metadata?.plan ? { plan: sub.metadata.plan } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as { id: string };
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            plan: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as { subscription?: string };
        if (inv.subscription) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', inv.subscription);
          // TODO: send payment failure email via Resend
        }
        break;
      }

      default:
        // Unhandled event type — safe to ignore
    }

    // Return success response
    return NextResponse.json({ received: true });

  } catch (error: unknown) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Stripe sends POST requests
export async function GET() {
  return NextResponse.json(
    { message: 'Stripe webhook endpoint. Use POST for webhook events.' },
    { status: 200 }
  );
}
