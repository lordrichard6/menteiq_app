/**
 * Resend Email Client
 * Handles sending emails via Resend API
 */

import { Resend } from 'resend';

// Lazy-initialize Resend client to avoid build-time errors when env var is absent
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
/** @deprecated Use getResend() internally; exported for legacy consumers */
const resend = { get emails() { return getResend().emails; } } as Resend;

// Default sender email (you'll need to verify this domain in Resend)
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'OrbitCRM <noreply@orbitcrm.app>';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions) {
  try {
    const { to, subject, html, text, from = DEFAULT_FROM, replyTo } = options;

    const data = await getResend().emails.send({
      from,
      to,
      subject,
      html,
      text,
      ...(replyTo && { reply_to: replyTo }),
    });

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send portal invitation email
 */
export async function sendPortalInvitation({
  to,
  contactName,
  companyName,
  magicLink,
  expiresInHours = 1,
}: {
  to: string;
  contactName: string;
  companyName: string;
  magicLink: string;
  expiresInHours?: number;
}) {
  // Dynamically import to avoid issues with server/client components
  const { PortalInvitationEmail, PortalInvitationEmailText } = await import(
    './portal-invitation'
  );

  const html = PortalInvitationEmail({
    contactName,
    companyName,
    magicLink,
    expiresInHours,
  });

  const text = PortalInvitationEmailText({
    contactName,
    companyName,
    magicLink,
    expiresInHours,
  });

  return sendEmail({
    to,
    subject: `Access Your ${companyName} Client Portal`,
    html,
    text,
  });
}

export { resend };
