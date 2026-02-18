/**
 * POST /api/notifications/check-triggers
 * Check for conditions that should trigger notifications
 *
 * Called by:
 * - Cron job (daily at 9am)
 * - Manual trigger from admin
 * - Background worker
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend-client';
import {
  OverdueInvoiceEmail,
  TaskReminderEmail,
  FollowUpReminderEmail,
} from '@/lib/email/notification-templates';

/** Supabase returns joined rows as arrays; extract the first element's property safely */
function joinedField<T extends Record<string, unknown>>(
  val: T | T[] | null | undefined,
  key: keyof T,
): T[keyof T] | undefined {
  if (!val) return undefined;
  const item = Array.isArray(val) ? val[0] : val;
  return item?.[key];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name');

    if (orgsError) throw orgsError;

    const results = {
      invoices_checked: 0,
      tasks_checked: 0,
      contacts_checked: 0,
      notifications_created: 0,
      emails_sent: 0,
    };

    for (const org of orgs || []) {
      // Get org users who want notifications
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('tenant_id', org.id);

      if (!users || users.length === 0) continue;

      // 1. CHECK OVERDUE INVOICES
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total, due_date, contact_id, contacts(name, email)')
        .eq('tenant_id', org.id)
        .in('status', ['sent', 'overdue'])
        .lt('due_date', new Date().toISOString())
        .is('notified_overdue', false);

      results.invoices_checked += overdueInvoices?.length || 0;

      for (const invoice of overdueInvoices || []) {
        for (const user of users) {
          // Check user preferences
          const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('notify_invoice_overdue, enable_email')
            .eq('user_id', user.id)
            .single();

          if (!prefs?.notify_invoice_overdue) continue;

          const daysOverdue = Math.floor(
            (new Date().getTime() - new Date(invoice.due_date).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          // Create notification
          const { error: notifError } = await supabase.rpc('create_notification', {
            p_tenant_id: org.id,
            p_user_id: user.id,
            p_type: 'invoice_overdue',
            p_title: `Invoice #${invoice.invoice_number} is overdue`,
            p_message: `Invoice for ${joinedField(invoice.contacts as any, 'name') || 'customer'} is ${daysOverdue} days overdue (CHF ${invoice.total})`,
            p_priority: daysOverdue > 30 ? 'high' : 'medium',
            p_related_id: invoice.id,
            p_related_type: 'invoice',
            p_action_url: `/admin/invoices/${invoice.id}`,
          });

          if (!notifError) {
            results.notifications_created++;

            // Send email if enabled
            if (prefs.enable_email) {
              const emailHtml = OverdueInvoiceEmail({
                userName: user.full_name || user.email,
                invoiceNumber: invoice.invoice_number,
                customerName: (joinedField(invoice.contacts as any, 'name') as string) || 'Customer',
                amount: invoice.total,
                daysOverdue,
                invoiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/invoices/${invoice.id}`,
              });

              await sendEmail({
                to: user.email,
                subject: `Invoice #${invoice.invoice_number} is ${daysOverdue} days overdue`,
                html: emailHtml,
              });

              results.emails_sent++;
            }
          }
        }

        // Mark invoice as notified
        await supabase
          .from('invoices')
          .update({ notified_overdue: true })
          .eq('id', invoice.id);
      }

      // 2. CHECK TASKS DUE SOON (next 24 hours)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: dueTasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, contact_id, contacts(name)')
        .eq('tenant_id', org.id)
        .eq('status', 'todo')
        .gte('due_date', new Date().toISOString())
        .lte('due_date', tomorrow.toISOString())
        .is('notified_due_soon', false);

      results.tasks_checked += dueTasks?.length || 0;

      for (const task of dueTasks || []) {
        for (const user of users) {
          const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('notify_task_due, enable_email')
            .eq('user_id', user.id)
            .single();

          if (!prefs?.notify_task_due) continue;

          const { error: notifError } = await supabase.rpc('create_notification', {
            p_tenant_id: org.id,
            p_user_id: user.id,
            p_type: 'task_due_soon',
            p_title: 'Task due tomorrow',
            p_message: `"${task.title}" is due tomorrow`,
            p_priority: 'medium',
            p_related_id: task.id,
            p_related_type: 'task',
            p_action_url: `/admin/tasks/${task.id}`,
          });

          if (!notifError) {
            results.notifications_created++;

            if (prefs.enable_email) {
              const emailHtml = TaskReminderEmail({
                userName: user.full_name || user.email,
                taskTitle: task.title,
                dueDate: new Date(task.due_date),
                contactName: joinedField(task.contacts as any, 'name') as string | undefined,
                taskUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/tasks/${task.id}`,
              });

              await sendEmail({
                to: user.email,
                subject: `Task reminder: "${task.title}" due tomorrow`,
                html: emailHtml,
              });

              results.emails_sent++;
            }
          }
        }

        await supabase
          .from('tasks')
          .update({ notified_due_soon: true })
          .eq('id', task.id);
      }

      // 3. CHECK OVERDUE TASKS
      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, contact_id, contacts(name)')
        .eq('tenant_id', org.id)
        .neq('status', 'done')
        .lt('due_date', new Date().toISOString())
        .is('notified_overdue', false);

      for (const task of overdueTasks || []) {
        for (const user of users) {
          const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('notify_task_overdue, enable_email')
            .eq('user_id', user.id)
            .single();

          if (!prefs?.notify_task_overdue) continue;

          await supabase.rpc('create_notification', {
            p_tenant_id: org.id,
            p_user_id: user.id,
            p_type: 'task_overdue',
            p_title: 'Task is overdue',
            p_message: `"${task.title}" is overdue`,
            p_priority: 'high',
            p_related_id: task.id,
            p_related_type: 'task',
            p_action_url: `/admin/tasks/${task.id}`,
          });

          results.notifications_created++;
        }

        await supabase
          .from('tasks')
          .update({ notified_overdue: true })
          .eq('id', task.id);
      }

      // 4. CHECK CONTACTS NEEDING FOLLOW-UP (no activity in 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: inactiveContacts } = await supabase
        .from('contacts')
        .select('id, name, email, status')
        .eq('tenant_id', org.id)
        .eq('status', 'lead')
        .lt('updated_at', thirtyDaysAgo.toISOString())
        .is('notified_follow_up', false);

      results.contacts_checked += inactiveContacts?.length || 0;

      for (const contact of inactiveContacts || []) {
        for (const user of users) {
          const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('notify_follow_up')
            .eq('user_id', user.id)
            .single();

          if (!prefs?.notify_follow_up) continue;

          await supabase.rpc('create_notification', {
            p_tenant_id: org.id,
            p_user_id: user.id,
            p_type: 'follow_up_reminder',
            p_title: 'Follow up needed',
            p_message: `${contact.name} has had no activity in 30 days`,
            p_priority: 'low',
            p_related_id: contact.id,
            p_related_type: 'contact',
            p_action_url: `/admin/contacts/${contact.id}`,
          });

          results.notifications_created++;
        }

        await supabase
          .from('contacts')
          .update({ notified_follow_up: true })
          .eq('id', contact.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notification check complete',
      results,
    });
  } catch (error: any) {
    console.error('Notification trigger error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check notification triggers',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
