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
import { StripeService } from '@/lib/services/stripe-service';
import { InvoiceService } from '@/lib/services/invoice-service';

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
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
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
          console.warn('Checkout session completed without invoice_id in metadata');
          break;
        }

        // Mark the invoice as paid
        try {
          await InvoiceService.markAsPaid(invoiceId, session.id);
        } catch (error) {
          console.error(`Failed to mark invoice ${invoiceId} as paid:`, error);
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
        // Payment failed — could notify user or update invoice status in future
        break;
      }

      default:
        // Unhandled event type — safe to ignore
    }

    // Return success response
    return NextResponse.json({ received: true });
    
  } catch (error: any) {
    console.error('Webhook error:', error);
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
