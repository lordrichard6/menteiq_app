/**
 * Stripe Service
 * 
 * Handles Stripe payment link creation for invoices.
 * 
 * SETUP REQUIRED:
 * 1. Install stripe: npm install stripe
 * 2. Add to .env.local:
 *    - STRIPE_SECRET_KEY=sk_test_...
 *    - STRIPE_WEBHOOK_SECRET=whsec_...
 *    - NEXT_PUBLIC_APP_URL=http://localhost:3000
 */

import type { Invoice } from '@/lib/types/schema';
import type Stripe from 'stripe';

// Lazy import Stripe to avoid errors if not installed
let stripe: Stripe | null = null;

async function getStripe() {
  if (!stripe) {
    try {
      const Stripe = (await import('stripe')).default;
      const secretKey = process.env.STRIPE_SECRET_KEY;

      if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
      }

      stripe = new Stripe(secretKey, {
        apiVersion: '2026-01-28.clover',
        typescript: true,
      });
    } catch (error) {
      throw new Error('Stripe is not available. Install with: npm install stripe');
    }
  }
  return stripe;
}

// =====================================================
// STRIPE SERVICE
// =====================================================

export const StripeService = {
  /**
   * Check if Stripe is configured
   */
  isConfigured(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
  },

  /**
   * Create a payment link for an invoice
   * Returns the Stripe payment link URL
   */
  async createPaymentLink(invoice: Invoice): Promise<string> {
    const stripeClient = await getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create a checkout session with payment link
    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: `Payment for invoice ${invoice.invoice_number}`,
            },
            unit_amount: Math.round(invoice.amount_total * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
      },
      success_url: `${appUrl}/portal/invoices/${invoice.id}?payment=success`,
      cancel_url: `${appUrl}/portal/invoices/${invoice.id}?payment=cancelled`,
    });

    if (!session.url) {
      throw new Error('Failed to create payment link');
    }

    return session.url;
  },

  /**
   * Create a reusable payment link (alternative to checkout session)
   * Payment links can be shared multiple times
   */
  async createReusablePaymentLink(invoice: Invoice): Promise<string> {
    const stripeClient = await getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // First, create a price
    const price = await stripeClient.prices.create({
      currency: invoice.currency.toLowerCase(),
      unit_amount: Math.round(invoice.amount_total * 100),
      product_data: {
        name: `Invoice ${invoice.invoice_number}`,
      },
    });

    // Then create the payment link
    const paymentLink = await stripeClient.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${appUrl}/portal/invoices/${invoice.id}?payment=success`,
        },
      },
    });

    return paymentLink.url;
  },

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(
    payload: string | Buffer,
    signature: string
  ): Promise<Stripe.Event> {
    const stripeClient = await getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    return stripeClient.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  },

  /**
   * Retrieve a checkout session
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    const stripeClient = await getStripe();
    return stripeClient.checkout.sessions.retrieve(sessionId);
  },
};
