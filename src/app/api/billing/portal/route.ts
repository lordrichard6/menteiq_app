import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * POST /api/billing/portal
 * Redirects the authenticated user to their Stripe Customer Portal
 * so they can manage/cancel their subscription, update payment methods, etc.
 */
export async function POST() {
    if (!process.env.STRIPE_SECRET_KEY) {
        return new NextResponse('Stripe is not configured', { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single();

    if (!subscription?.stripe_customer_id) {
        return new NextResponse('No active subscription found', { status: 404 });
    }

    try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover', typescript: true });

        const session = await stripe.billingPortal.sessions.create({
            customer: subscription.stripe_customer_id,
            return_url: `${SITE_URL}/settings`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: unknown) {
        Sentry.captureException(err);
        return new NextResponse((err as Error).message, { status: 500 });
    }
}
