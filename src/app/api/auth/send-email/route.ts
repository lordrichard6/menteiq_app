/**
 * Supabase send_email Auth Hook
 *
 * Supabase calls this endpoint instead of sending its default email.
 * We verify the request, then send a branded email via Resend.
 *
 * Docs: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
 */

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { sendEmail } from '@/lib/email/resend-client'
import {
  confirmSignupEmail,
  passwordResetEmail,
  magicLinkEmail,
  emailChangeEmail,
} from '@/lib/email/auth-templates'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SupabaseEmailHookPayload {
  user: {
    id: string
    email: string
    user_metadata?: { full_name?: string; name?: string }
  }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: 'signup' | 'recovery' | 'magiclink' | 'invite' | 'email_change'
    site_url: string
    token_new: string
    token_hash_new: string
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verify the Supabase hook signature (HMAC-SHA256).
 * Supabase sends: Authorization: v1,<hex-encoded HMAC-SHA256 of raw body>
 * The HMAC key is the base64-decoded bytes from the whsec_ secret in config.toml.
 */
async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET
  if (!secret) {
    Sentry.addBreadcrumb({
      category: 'auth',
      message: '[send-email hook] SEND_EMAIL_HOOK_SECRET not set — skipping signature check',
      level: 'warning',
    })
    return true
  }

  const authHeader = req.headers.get('authorization') ?? ''

  if (!authHeader.startsWith('v1,')) {
    Sentry.captureMessage('[send-email hook] Unexpected Authorization header format', {
      level: 'error',
      extra: { headerPrefix: authHeader.slice(0, 60) },
    })
    return false
  }

  const receivedHex = authHeader.slice(3) // strip "v1,"

  // secret is a hex string — convert to raw bytes for HMAC key
  const keyBytes = new Uint8Array(
    secret.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  )

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC', cryptoKey, new TextEncoder().encode(rawBody)
  )
  const expectedHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  if (expectedHex !== receivedHex) {
    Sentry.captureMessage('[send-email hook] HMAC mismatch — rejecting request', {
      level: 'error',
    })
    return false
  }

  return true
}

/**
 * Build the confirmation/action URL from token_hash.
 */
function buildActionUrl(payload: SupabaseEmailHookPayload): string {
  const { token_hash, email_action_type, redirect_to } = payload.email_data
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.menteiq.ch'

  const typeMap: Record<string, string> = {
    signup: 'signup',
    recovery: 'recovery',
    magiclink: 'magiclink',
    invite: 'invite',
    email_change: 'email_change',
  }

  const verifyType = typeMap[email_action_type] ?? email_action_type
  const redirectTo = redirect_to || `${appUrl}/dashboard`

  return `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${verifyType}&redirect_to=${encodeURIComponent(redirectTo)}`
}

function getFirstName(user: SupabaseEmailHookPayload['user']): string | undefined {
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name
  return fullName?.split(' ')[0]
}

// ─── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    const isValid = await verifySignature(req, rawBody)
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload: SupabaseEmailHookPayload = JSON.parse(rawBody)
    const { user, email_data } = payload
    const { email_action_type } = email_data

    const to = user.email
    const firstName = getFirstName(user)
    const actionUrl = buildActionUrl(payload)

    let subject: string
    let html: string

    switch (email_action_type) {
      case 'signup':
      case 'invite':
        subject = 'Confirm your MenteIQ account'
        html = confirmSignupEmail(actionUrl, firstName)
        break
      case 'recovery':
        subject = 'Reset your MenteIQ password'
        html = passwordResetEmail(actionUrl, firstName)
        break
      case 'magiclink':
        subject = 'Your MenteIQ sign-in link'
        html = magicLinkEmail(actionUrl, firstName)
        break
      case 'email_change':
        subject = 'Confirm your new email — MenteIQ'
        html = emailChangeEmail(actionUrl, user.email, firstName)
        break
      default:
        Sentry.captureMessage('[send-email hook] Unknown action type', {
          level: 'error',
          extra: { email_action_type },
        })
        // Return 200 so Supabase doesn't retry — we just won't send an email
        return NextResponse.json({}, { status: 200 })
    }

    const result = await sendEmail({ to, subject, html })

    if (!result.success) {
      Sentry.captureMessage('[send-email hook] Resend failed', {
        level: 'error',
        extra: { error: result.error },
      })
      // Return 200 to prevent Supabase from blocking signup — email failure is non-fatal
      return NextResponse.json({}, { status: 200 })
    }

    // Supabase requires Content-Type: application/json on the success response
    return NextResponse.json({}, { status: 200 })

  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
