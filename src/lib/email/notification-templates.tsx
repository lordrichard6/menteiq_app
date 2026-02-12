/**
 * Email Templates for Notifications
 * Professional HTML templates for various notification types
 */

interface OverdueInvoiceEmailProps {
  userName: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  daysOverdue: number;
  invoiceUrl: string;
}

export function OverdueInvoiceEmail({
  userName,
  invoiceNumber,
  customerName,
  amount,
  daysOverdue,
  invoiceUrl,
}: OverdueInvoiceEmailProps) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice Overdue</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <div style="display: inline-block; background-color: #fee2e2; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
                <svg width="32" height="32" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">
                Invoice Overdue
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #374151;">
                Hi ${userName},
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #374151;">
                This is a reminder that <strong>Invoice #${invoiceNumber}</strong> for ${customerName} is now <strong style="color: #dc2626;">${daysOverdue} days overdue</strong>.
              </p>

              <!-- Invoice Details -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invoice:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">#${invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Customer:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${customerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">CHF ${amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Days Overdue:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #dc2626;">${daysOverdue} days</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${invoiceUrl}"
                       style="display: inline-block; padding: 14px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      View Invoice
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                Consider following up with ${customerName} to resolve this overdue payment.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #6b7280; text-align: center;">
                This is an automated notification from OrbitCRM
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

interface TaskReminderEmailProps {
  userName: string;
  taskTitle: string;
  dueDate: Date;
  contactName?: string;
  taskUrl: string;
}

export function TaskReminderEmail({
  userName,
  taskTitle,
  dueDate,
  contactName,
  taskUrl,
}: TaskReminderEmailProps) {
  const dueDateStr = dueDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <div style="display: inline-block; background-color: #fef3c7; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
                <svg width="32" height="32" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">
                Task Reminder
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #374151;">
                Hi ${userName},
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #374151;">
                This is a reminder that you have a task due tomorrow:
              </p>

              <!-- Task Details -->
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #111827;">
                  ${taskTitle}
                </h2>
                ${contactName ? `<p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Related to: ${contactName}</p>` : ''}
                <p style="margin: 0; font-size: 14px; color: #6b7280;">Due: ${dueDateStr}</p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${taskUrl}"
                       style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      View Task
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                Make sure to complete this task before the due date.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #6b7280; text-align: center;">
                This is an automated notification from OrbitCRM
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

interface FollowUpReminderEmailProps {
  userName: string;
  contactName: string;
  daysSinceContact: number;
  contactUrl: string;
}

export function FollowUpReminderEmail({
  userName,
  contactName,
  daysSinceContact,
  contactUrl,
}: FollowUpReminderEmailProps) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Follow-up Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
                <svg width="32" height="32" fill="none" stroke="#3b82f6" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">
                Follow-up Reminder
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #374151;">
                Hi ${userName},
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #374151;">
                It's been <strong>${daysSinceContact} days</strong> since you last contacted <strong>${contactName}</strong>. Consider reaching out to maintain the relationship.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${contactUrl}"
                       style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      View Contact
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                Regular follow-ups help convert leads into clients.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #6b7280; text-align: center;">
                This is an automated notification from OrbitCRM
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
