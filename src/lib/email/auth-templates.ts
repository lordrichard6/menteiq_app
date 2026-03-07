/**
 * Auth Email Templates
 * Branded MenteIQ templates for Supabase auth emails
 * (confirm signup, password reset, magic link, email change)
 */

const BRAND_COLOR = '#6366f1' // indigo-500
const BRAND_NAME = 'MenteIQ'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.menteiq.ch'

function baseLayout(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f3f4f6;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;color:#f3f4f6;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:48px 20px;">
        <table role="presentation" style="width:100%;max-width:560px;">

          <!-- Logo / Brand header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="display:inline-flex;align-items:center;gap:8px;">
                <div style="width:36px;height:36px;background:${BRAND_COLOR};border-radius:8px;display:inline-block;"></div>
                <span style="font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.5px;">${BRAND_NAME}</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                <a href="${APP_URL}" style="color:#9ca3af;text-decoration:underline;">${APP_URL.replace('https://', '')}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

function ctaButton(href: string, text: string): string {
  return `
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:8px 0 28px;">
        <a href="${href}"
           style="display:inline-block;padding:14px 36px;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:600;letter-spacing:0.01em;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`
}

function fallbackLink(href: string): string {
  return `
  <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
    If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${href}" style="color:${BRAND_COLOR};word-break:break-all;font-size:12px;">${href}</a>
  </p>`
}

// ─── Confirm Signup ────────────────────────────────────────────────────────────

export function confirmSignupEmail(confirmUrl: string, firstName?: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Welcome aboard,'
  const body = `
    <div style="padding:40px 40px 32px;border-bottom:1px solid #f3f4f6;text-align:center;">
      <div style="width:56px;height:56px;background:#eef2ff;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:28px;">✉️</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Confirm your email</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;">One last step to get started</p>
    </div>

    <div style="padding:32px 40px 8px;">
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#374151;">
        ${greeting}
      </p>
      <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#374151;">
        Thanks for creating your ${BRAND_NAME} account. Please confirm your email address to activate your account and start managing your business smarter.
      </p>

      ${ctaButton(confirmUrl, 'Confirm Email Address')}

      <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.5;">
        This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
      </p>

      ${fallbackLink(confirmUrl)}
    </div>

    <div style="padding:24px 40px;background:#f9fafb;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        You're receiving this because someone signed up for ${BRAND_NAME} using this email address.
      </p>
    </div>
  `
  return baseLayout('Confirm your MenteIQ account', `Confirm your email to activate your ${BRAND_NAME} account`, body)
}

// ─── Password Reset ────────────────────────────────────────────────────────────

export function passwordResetEmail(resetUrl: string, firstName?: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,'
  const body = `
    <div style="padding:40px 40px 32px;border-bottom:1px solid #f3f4f6;text-align:center;">
      <div style="width:56px;height:56px;background:#fef3c7;border-radius:50%;margin:0 auto 20px;">
        <span style="font-size:28px;line-height:56px;display:block;">🔑</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Reset your password</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;">We received a password reset request</p>
    </div>

    <div style="padding:32px 40px 8px;">
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#374151;">${greeting}</p>
      <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#374151;">
        Someone requested a password reset for your ${BRAND_NAME} account. Click the button below to choose a new password.
      </p>

      ${ctaButton(resetUrl, 'Reset Password')}

      <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.5;">
        This link expires in <strong>1 hour</strong>. If you didn't request a password reset, please ignore this email — your account is safe.
      </p>

      ${fallbackLink(resetUrl)}
    </div>

    <div style="padding:24px 40px;background:#f9fafb;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        You're receiving this because a password reset was requested for your ${BRAND_NAME} account.
      </p>
    </div>
  `
  return baseLayout('Reset your MenteIQ password', 'Reset your MenteIQ password — link expires in 1 hour', body)
}

// ─── Magic Link ────────────────────────────────────────────────────────────────

export function magicLinkEmail(magicUrl: string, firstName?: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,'
  const body = `
    <div style="padding:40px 40px 32px;border-bottom:1px solid #f3f4f6;text-align:center;">
      <div style="width:56px;height:56px;background:#ecfdf5;border-radius:50%;margin:0 auto 20px;">
        <span style="font-size:28px;line-height:56px;display:block;">⚡</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Your sign-in link</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;">Click below to sign in instantly</p>
    </div>

    <div style="padding:32px 40px 8px;">
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#374151;">${greeting}</p>
      <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#374151;">
        Here's your one-time sign-in link for ${BRAND_NAME}. No password needed.
      </p>

      ${ctaButton(magicUrl, 'Sign In to MenteIQ')}

      <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.5;">
        This link expires in <strong>1 hour</strong> and can only be used once. If you didn't request this, you can safely ignore it.
      </p>

      ${fallbackLink(magicUrl)}
    </div>

    <div style="padding:24px 40px;background:#f9fafb;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        You're receiving this because a sign-in was requested for your ${BRAND_NAME} account.
      </p>
    </div>
  `
  return baseLayout('Sign in to MenteIQ', 'Your one-time sign-in link for MenteIQ', body)
}

// ─── Email Change ──────────────────────────────────────────────────────────────

export function emailChangeEmail(confirmUrl: string, newEmail: string, firstName?: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,'
  const body = `
    <div style="padding:40px 40px 32px;border-bottom:1px solid #f3f4f6;text-align:center;">
      <div style="width:56px;height:56px;background:#ede9fe;border-radius:50%;margin:0 auto 20px;">
        <span style="font-size:28px;line-height:56px;display:block;">📧</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Confirm email change</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;">Verify your new email address</p>
    </div>

    <div style="padding:32px 40px 8px;">
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#374151;">${greeting}</p>
      <p style="margin:0 0 8px;font-size:16px;line-height:1.6;color:#374151;">
        You requested to change your email address. Your new email will be:
      </p>
      <p style="margin:0 0 28px;font-size:16px;font-weight:600;color:#111827;">${newEmail}</p>

      ${ctaButton(confirmUrl, 'Confirm New Email')}

      <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.5;">
        This link expires in <strong>24 hours</strong>. If you didn't request this change, please ignore this email.
      </p>

      ${fallbackLink(confirmUrl)}
    </div>

    <div style="padding:24px 40px;background:#f9fafb;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        You're receiving this because an email change was requested on your ${BRAND_NAME} account.
      </p>
    </div>
  `
  return baseLayout('Confirm your new email — MenteIQ', `Confirm your new email address for ${BRAND_NAME}`, body)
}
