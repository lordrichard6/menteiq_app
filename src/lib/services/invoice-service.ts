/**
 * Invoice Service
 * 
 * Handles invoice business logic:
 * - Sequential invoice numbering
 * - Totals calculation (subtotal, tax, grand total)
 * - CRUD operations with line items
 * - PDF generation routing (Swiss QR-Bill vs EU SEPA)
 */

import { createClient } from '@/lib/supabase/server';
import type {
  Invoice,
  InvoiceInsert,
  InvoiceLineItem,
  InvoiceLineItemInsert,
  InvoiceType,
  InvoiceStatus
} from '@/lib/types/schema';

// =====================================================
// TYPES
// =====================================================

export interface LineItemInput {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  sort_order?: number;
}

export interface CreateInvoiceInput {
  contact_id: string | null;
  project_id?: string | null;
  currency: string;
  invoice_type: InvoiceType;
  due_date?: string | null;
  notes?: string | null;
  line_items: LineItemInput[];
}

export interface UpdateInvoiceInput {
  contact_id?: string | null;
  project_id?: string | null;
  currency?: string;
  invoice_type?: InvoiceType;
  status?: InvoiceStatus;
  due_date?: string | null;
  notes?: string | null;
  line_items?: LineItemInput[];
}

export interface InvoiceWithLineItems extends Invoice {
  line_items: InvoiceLineItem[];
  contact?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    is_company: boolean;
    email: string | null;
    address_line1: string | null;
    city: string | null;
    postal_code: string | null;
    country: string;
  } | null;
}

export interface CalculatedTotals {
  subtotal: number;
  tax_total: number;
  amount_total: number;
}

// =====================================================
// CALCULATIONS
// =====================================================

/**
 * Calculate totals from line items
 */
export function calculateTotals(lineItems: LineItemInput[]): CalculatedTotals {
  let subtotal = 0;
  let tax_total = 0;

  for (const item of lineItems) {
    const lineTotal = item.quantity * item.unit_price;
    const lineTax = lineTotal * (item.tax_rate / 100);
    subtotal += lineTotal;
    tax_total += lineTax;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_total: Math.round(tax_total * 100) / 100,
    amount_total: Math.round((subtotal + tax_total) * 100) / 100,
  };
}

// =====================================================
// INVOICE SERVICE
// =====================================================

export const InvoiceService = {
  /**
   * Generate the next invoice number for an organization
   * Format: {prefix}-{year}-{sequence}
   * Example: INV-2026-0001
   */
  async generateInvoiceNumber(tenantId: string): Promise<string> {
    const supabase = await createClient();
    const year = new Date().getFullYear();

    // Get organization settings for prefix
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', tenantId)
      .single();

    const settings = (org?.settings as Record<string, unknown>) || {};
    const billing = (settings.billing as Record<string, unknown>) || {};
    const prefix = (billing.invoice_prefix as string) || 'INV';

    // Count existing invoices this year for this tenant
    const startOfYear = `${year}-01-01`;
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', startOfYear);

    const nextNumber = (count || 0) + 1;
    const paddedNumber = nextNumber.toString().padStart(4, '0');

    return `${prefix}-${year}-${paddedNumber}`;
  },

  /**
   * Generate a QR reference for Swiss QR-Bill
   * Uses RF Creditor Reference format (ISO 11649)
   */
  generateQRReference(): string {
    // Generate a random 21-digit number
    const randomDigits = Array.from({ length: 21 }, () =>
      Math.floor(Math.random() * 10)
    ).join('');

    // Format with spaces for readability
    return randomDigits.replace(/(.{5})/g, '$1 ').trim();
  },

  /**
   * Create a new invoice with line items
   */
  async createInvoice(
    tenantId: string,
    input: CreateInvoiceInput
  ): Promise<InvoiceWithLineItems> {
    const supabase = await createClient();

    // Calculate totals
    const totals = calculateTotals(input.line_items);

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    // Get organization IBAN for the invoice
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', tenantId)
      .single();

    const settings = (org?.settings as Record<string, unknown>) || {};
    const billing = (settings.billing as Record<string, unknown>) || {};
    const iban = (billing.iban as string) || null;

    // Create invoice record
    const invoiceData: InvoiceInsert = {
      tenant_id: tenantId,
      contact_id: input.contact_id,
      project_id: input.project_id || null,
      invoice_number: invoiceNumber,
      currency: input.currency,
      invoice_type: input.invoice_type,
      status: 'draft',
      subtotal: totals.subtotal,
      tax_total: totals.tax_total,
      amount_total: totals.amount_total,
      due_date: input.due_date || null,
      notes: input.notes || null,
      qr_reference: input.invoice_type === 'swiss_qr' ? this.generateQRReference() : null,
      iban_used: iban,
      invoice_date: new Date().toISOString().split('T')[0],
      paid_at: null,
      stripe_payment_link: null,
      stripe_payment_id: null,
    };

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Failed to create invoice: ${invoiceError?.message}`);
    }

    // Create line items
    const lineItemsData: InvoiceLineItemInsert[] = input.line_items.map((item, index) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      sort_order: item.sort_order ?? index,
    }));

    const { data: lineItems, error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .insert(lineItemsData)
      .select();

    if (lineItemsError) {
      // Rollback: delete the invoice if line items fail
      await supabase.from('invoices').delete().eq('id', invoice.id);
      throw new Error(`Failed to create line items: ${lineItemsError.message}`);
    }

    return {
      ...invoice,
      line_items: lineItems || [],
    };
  },

  /**
   * Get invoice with line items and contact
   */
  async getInvoice(invoiceId: string): Promise<InvoiceWithLineItems | null> {
    const supabase = await createClient();

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        contacts (
          id,
          first_name,
          last_name,
          company_name,
          is_company,
          email,
          address_line1,
          city,
          postal_code,
          country
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      return null;
    }

    // Get line items
    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true });

    return {
      ...invoice,
      contact: invoice.contacts as InvoiceWithLineItems['contact'],
      line_items: lineItems || [],
    };
  },

  /**
   * List all invoices for a tenant
   */
  async listInvoices(tenantId: string): Promise<InvoiceWithLineItems[]> {
    const supabase = await createClient();

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        contacts (
          id,
          first_name,
          last_name,
          company_name,
          is_company,
          email
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error || !invoices) {
      return [];
    }

    // Get line items for all invoices
    const invoiceIds = invoices.map(i => i.id);
    const { data: allLineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .in('invoice_id', invoiceIds)
      .order('sort_order', { ascending: true });

    // Group line items by invoice
    const lineItemsByInvoice = new Map<string, InvoiceLineItem[]>();
    for (const item of allLineItems || []) {
      const existing = lineItemsByInvoice.get(item.invoice_id) || [];
      existing.push(item);
      lineItemsByInvoice.set(item.invoice_id, existing);
    }

    return invoices.map(invoice => ({
      ...invoice,
      contact: invoice.contacts as InvoiceWithLineItems['contact'],
      line_items: lineItemsByInvoice.get(invoice.id) || [],
    }));
  },

  /**
   * Update an invoice and its line items
   */
  async updateInvoice(
    invoiceId: string,
    input: UpdateInvoiceInput
  ): Promise<InvoiceWithLineItems> {
    const supabase = await createClient();

    // Build update object
    const updateData: Partial<InvoiceInsert> = {};

    if (input.contact_id !== undefined) updateData.contact_id = input.contact_id;
    if (input.project_id !== undefined) updateData.project_id = input.project_id;
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.invoice_type !== undefined) updateData.invoice_type = input.invoice_type;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.due_date !== undefined) updateData.due_date = input.due_date;
    if (input.notes !== undefined) updateData.notes = input.notes;

    // If line items are provided, recalculate totals
    if (input.line_items) {
      const totals = calculateTotals(input.line_items);
      updateData.subtotal = totals.subtotal;
      updateData.tax_total = totals.tax_total;
      updateData.amount_total = totals.amount_total;

      // Delete existing line items
      await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', invoiceId);

      // Insert new line items
      const lineItemsData: InvoiceLineItemInsert[] = input.line_items.map((item, index) => ({
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        sort_order: item.sort_order ?? index,
      }));

      await supabase
        .from('invoice_line_items')
        .insert(lineItemsData);
    }

    // Update invoice
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) {
        throw new Error(`Failed to update invoice: ${error.message}`);
      }
    }

    // Return updated invoice
    const result = await this.getInvoice(invoiceId);
    if (!result) {
      throw new Error('Invoice not found after update');
    }

    return result;
  },

  /**
   * Mark invoice as paid
   */
  async markAsPaid(invoiceId: string, stripePaymentId?: string): Promise<Invoice> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_payment_id: stripePaymentId || null,
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to mark invoice as paid: ${error?.message}`);
    }

    return data;
  },

  /**
   * Mark invoice as sent
   */
  async markAsSent(invoiceId: string): Promise<Invoice> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'sent' })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to mark invoice as sent: ${error?.message}`);
    }

    return data;
  },

  /**
   * Set Stripe payment link on invoice
   */
  async setPaymentLink(invoiceId: string, paymentLink: string): Promise<Invoice> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('invoices')
      .update({ stripe_payment_link: paymentLink })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to set payment link: ${error?.message}`);
    }

    return data;
  },

  /**
   * Delete an invoice and its line items (cascade)
   */
  async deleteInvoice(invoiceId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) {
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }
  },
};
