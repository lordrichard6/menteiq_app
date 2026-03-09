import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { StripeService } from '@/lib/services/stripe-service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const checkoutSchema = z.object({
    plan: z.enum(['pro', 'business']),
    interval: z.enum(['monthly', 'yearly']).default('monthly'),
});

const PRICE_IDS: Record<string, string | undefined> = {
    pro_monthly_chf:      process.env.STRIPE_PRICE_PRO_MONTHLY_CHF,
    pro_yearly_chf:       process.env.STRIPE_PRICE_PRO_YEARLY_CHF,
    business_monthly_chf: process.env.STRIPE_PRICE_BUSINESS_MONTHLY_CHF,
    business_yearly_chf:  process.env.STRIPE_PRICE_BUSINESS_YEARLY_CHF,
    pro_monthly_eur:      process.env.STRIPE_PRICE_PRO_MONTHLY_EUR,
    pro_yearly_eur:       process.env.STRIPE_PRICE_PRO_YEARLY_EUR,
    business_monthly_eur: process.env.STRIPE_PRICE_BUSINESS_MONTHLY_EUR,
    business_yearly_eur:  process.env.STRIPE_PRICE_BUSINESS_YEARLY_EUR,
};

/** Swiss users pay CHF; everyone else pays EUR. Derived from Vercel's geo header. */
function detectCurrency(req: Request): 'chf' | 'eur' {
    const country = req.headers.get('x-vercel-ip-country') ?? '';
    return country.toUpperCase() === 'CH' ? 'chf' : 'eur';
}

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session for a MenteIQ subscription.
 */
export async function POST(req: Request) {
    if (!StripeService.isConfigured()) {
        return new NextResponse('Stripe is not configured', { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) return new NextResponse('Invalid request body', { status: 400 });

    const { plan, interval } = parsed.data;
    const currency = detectCurrency(req);
    const priceKey = `${plan}_${interval}_${currency}`;
    const priceId = PRICE_IDS[priceKey];
    if (!priceId) return new NextResponse(`Price not configured: ${priceKey}`, { status: 500 });

    // Look up existing Stripe customer ID for this user
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single();

    try {
        const stripeClient = await (await import('@/lib/services/stripe-service')).StripeService;
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover', typescript: true });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            ...(subscription?.stripe_customer_id
                ? { customer: subscription.stripe_customer_id }
                : { customer_email: user.email }),
            metadata: { user_id: user.id, plan },
            subscription_data: { metadata: { user_id: user.id, plan } },
            success_url: `${SITE_URL}/settings?billing=success`,
            cancel_url: `${SITE_URL}/settings?billing=cancelled`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: unknown) {
        Sentry.captureException(err);
        return new NextResponse((err as Error).message, { status: 500 });
    }
}
