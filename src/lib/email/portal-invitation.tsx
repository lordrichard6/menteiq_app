/**
 * Portal Invitation Email Template
 * Sent when a contact is invited to access their client portal
 */

interface PortalInvitationEmailProps {
  contactName: string;
  companyName: string;
  magicLink: string;
  expiresInHours?: number;
}

export function PortalInvitationEmail({
  contactName,
  companyName,
  magicLink,
  expiresInHours = 1,
}: PortalInvitationEmailProps) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Your Client Portal</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">
                Welcome to Your Client Portal
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #374151;">
                Hi ${contactName},
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #374151;">
                ${companyName} has invited you to access your personalized client portal. Here you can:
              </p>

              <ul style="margin: 0 0 24px; padding-left: 20px; color: #374151;">
                <li style="margin-bottom: 8px; font-size: 16px; line-height: 24px;">View and download your invoices</li>
                <li style="margin-bottom: 8px; font-size: 16px; line-height: 24px;">Track project progress</li>
                <li style="margin-bottom: 8px; font-size: 16px; line-height: 24px;">Access shared documents</li>
                <li style="margin-bottom: 0; font-size: 16px; line-height: 24px;">Stay updated on your account</li>
              </ul>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${magicLink}"
                       style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                      Access Your Portal
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #6b7280;">
                <strong>Security Note:</strong> This link will expire in ${expiresInHours} hour${expiresInHours !== 1 ? 's' : ''} and can only be used once. If you need a new link, please contact ${companyName}.
              </p>

              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; line-height: 18px; color: #9ca3af; word-break: break-all;">
                ${magicLink}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 8px; font-size: 12px; line-height: 18px; color: #6b7280; text-align: center;">
                This email was sent by ${companyName}
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9ca3af; text-align: center;">
                If you didn't request this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Plain text version of the portal invitation email
 * Used as fallback for email clients that don't support HTML
 */
export function PortalInvitationEmailText({
  contactName,
  companyName,
  magicLink,
  expiresInHours = 1,
}: PortalInvitationEmailProps) {
  return `
Welcome to Your Client Portal

Hi ${contactName},

${companyName} has invited you to access your personalized client portal. Here you can:

• View and download your invoices
• Track project progress
• Access shared documents
• Stay updated on your account

Access your portal by clicking this link:
${magicLink}

Security Note: This link will expire in ${expiresInHours} hour${expiresInHours !== 1 ? 's' : ''} and can only be used once. If you need a new link, please contact ${companyName}.

---

This email was sent by ${companyName}.
If you didn't request this invitation, you can safely ignore this email.
  `.trim();
}
