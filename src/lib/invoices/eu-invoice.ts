/**
 * EU SEPA Invoice PDF Generator
 * 
 * Generates a standard European invoice with:
 * - Creditor header (company info, VAT number)
 * - Debtor address block
 * - Invoice details (number, date, due date)
 * - Line items table
 * - Totals breakdown (subtotal, VAT, grand total)
 * - Bank details (IBAN, BIC)
 */

import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import type { InvoiceLineItem } from '@/lib/types/schema';
import { getVatLabel } from './tax-rates';

// =====================================================
// TYPES
// =====================================================

export interface CreditorInfo {
  company_name: string;
  address: string;
  zip: string;
  city: string;
  country: string;
  vat_number?: string;
  iban: string;
  bic?: string;
  bank_name?: string;
  email?: string;
  phone?: string;
}

export interface DebtorInfo {
  name: string;
  address: string;
  zip: string;
  city: string;
  country: string;
}

export interface EUInvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  creditor: CreditorInfo;
  debtor: DebtorInfo;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_total: number;
  amount_total: number;
  notes?: string;
}

// =====================================================
// PDF GENERATOR
// =====================================================

export const EUInvoiceService = {
  /**
   * Generate a standard EU invoice PDF
   */
  generatePDF(data: EUInvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${data.invoice_number}`,
          Author: data.creditor.company_name,
        }
      });

      const stream = new PassThrough();
      const chunks: Buffer[] = [];

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err) => reject(err));

      doc.pipe(stream);

      // ===== HEADER: Creditor Info (Top Right) =====
      const pageWidth = doc.page.width - 100; // Account for margins
      
      doc.fontSize(18)
        .font('Helvetica-Bold')
        .text(data.creditor.company_name, 50, 50, { width: pageWidth });
      
      doc.fontSize(10)
        .font('Helvetica')
        .text(data.creditor.address, 50, 75)
        .text(`${data.creditor.zip} ${data.creditor.city}`, 50, 87)
        .text(data.creditor.country, 50, 99);
      
      if (data.creditor.vat_number) {
        doc.text(`VAT: ${data.creditor.vat_number}`, 50, 111);
      }
      
      if (data.creditor.email) {
        doc.text(data.creditor.email, 50, 123);
      }

      // ===== INVOICE TITLE =====
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .text('INVOICE', 350, 50, { align: 'right', width: 195 });

      // ===== INVOICE DETAILS (Top Right) =====
      const detailsY = 90;
      doc.fontSize(10)
        .font('Helvetica');
      
      doc.text('Invoice No:', 350, detailsY, { width: 100 });
      doc.text(data.invoice_number, 450, detailsY, { width: 95, align: 'right' });
      
      doc.text('Date:', 350, detailsY + 15, { width: 100 });
      doc.text(formatDate(data.invoice_date), 450, detailsY + 15, { width: 95, align: 'right' });
      
      doc.text('Due Date:', 350, detailsY + 30, { width: 100 });
      doc.text(formatDate(data.due_date), 450, detailsY + 30, { width: 95, align: 'right' });

      // ===== DEBTOR INFO (Bill To) =====
      const billToY = 180;
      doc.fontSize(11)
        .font('Helvetica-Bold')
        .text('Bill To:', 50, billToY);
      
      doc.fontSize(10)
        .font('Helvetica')
        .text(data.debtor.name, 50, billToY + 18)
        .text(data.debtor.address, 50, billToY + 30)
        .text(`${data.debtor.zip} ${data.debtor.city}`, 50, billToY + 42)
        .text(data.debtor.country, 50, billToY + 54);

      // ===== LINE ITEMS TABLE =====
      const tableTop = 280;
      const tableLeft = 50;
      const colWidths = {
        description: 220,
        qty: 60,
        unitPrice: 80,
        tax: 60,
        total: 75,
      };

      // Table header
      doc.rect(tableLeft, tableTop, pageWidth, 25)
        .fill('#f0f0f0');
      
      doc.fillColor('#000000')
        .fontSize(10)
        .font('Helvetica-Bold');
      
      let xPos = tableLeft + 5;
      doc.text('Description', xPos, tableTop + 8, { width: colWidths.description });
      xPos += colWidths.description;
      doc.text('Qty', xPos, tableTop + 8, { width: colWidths.qty, align: 'right' });
      xPos += colWidths.qty;
      doc.text('Unit Price', xPos, tableTop + 8, { width: colWidths.unitPrice, align: 'right' });
      xPos += colWidths.unitPrice;
      doc.text('Tax', xPos, tableTop + 8, { width: colWidths.tax, align: 'right' });
      xPos += colWidths.tax;
      doc.text('Total', xPos, tableTop + 8, { width: colWidths.total, align: 'right' });

      // Table rows
      doc.font('Helvetica')
        .fontSize(9);
      
      let rowY = tableTop + 30;
      const vatLabel = getVatLabel(data.creditor.country);
      
      for (const item of data.line_items) {
        // Alternate row colors
        if (data.line_items.indexOf(item) % 2 === 1) {
          doc.rect(tableLeft, rowY - 3, pageWidth, 20)
            .fill('#fafafa');
          doc.fillColor('#000000');
        }

        xPos = tableLeft + 5;
        doc.text(item.description, xPos, rowY, { width: colWidths.description });
        xPos += colWidths.description;
        doc.text(item.quantity.toString(), xPos, rowY, { width: colWidths.qty, align: 'right' });
        xPos += colWidths.qty;
        doc.text(formatMoney(item.unit_price, data.currency), xPos, rowY, { width: colWidths.unitPrice, align: 'right' });
        xPos += colWidths.unitPrice;
        doc.text(`${item.tax_rate}%`, xPos, rowY, { width: colWidths.tax, align: 'right' });
        xPos += colWidths.tax;
        doc.text(formatMoney(item.line_total, data.currency), xPos, rowY, { width: colWidths.total, align: 'right' });
        
        rowY += 20;
      }

      // Table border
      doc.rect(tableLeft, tableTop, pageWidth, rowY - tableTop + 5)
        .stroke('#cccccc');

      // ===== TOTALS =====
      const totalsY = rowY + 20;
      const totalsLabelX = 350;
      const totalsValueX = 450;
      
      doc.fontSize(10)
        .font('Helvetica');
      
      doc.text('Subtotal:', totalsLabelX, totalsY, { width: 100 });
      doc.text(formatMoney(data.subtotal, data.currency), totalsValueX, totalsY, { width: 95, align: 'right' });
      
      doc.text(`${vatLabel}:`, totalsLabelX, totalsY + 18, { width: 100 });
      doc.text(formatMoney(data.tax_total, data.currency), totalsValueX, totalsY + 18, { width: 95, align: 'right' });
      
      // Total line
      doc.moveTo(totalsLabelX, totalsY + 38)
        .lineTo(545, totalsY + 38)
        .stroke('#000000');
      
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('Total:', totalsLabelX, totalsY + 45, { width: 100 });
      doc.text(formatMoney(data.amount_total, data.currency), totalsValueX, totalsY + 45, { width: 95, align: 'right' });

      // ===== BANK DETAILS =====
      const bankY = totalsY + 90;
      
      doc.fontSize(11)
        .font('Helvetica-Bold')
        .text('Bank Details', 50, bankY);
      
      doc.fontSize(10)
        .font('Helvetica');
      
      doc.text('IBAN:', 50, bankY + 18, { width: 60 });
      doc.text(formatIBAN(data.creditor.iban), 110, bankY + 18);
      
      if (data.creditor.bic) {
        doc.text('BIC:', 50, bankY + 33, { width: 60 });
        doc.text(data.creditor.bic, 110, bankY + 33);
      }
      
      if (data.creditor.bank_name) {
        doc.text('Bank:', 50, bankY + 48, { width: 60 });
        doc.text(data.creditor.bank_name, 110, bankY + 48);
      }

      // ===== NOTES =====
      if (data.notes) {
        const notesY = bankY + 80;
        doc.fontSize(11)
          .font('Helvetica-Bold')
          .text('Notes', 50, notesY);
        
        doc.fontSize(9)
          .font('Helvetica')
          .text(data.notes, 50, notesY + 15, { width: pageWidth });
      }

      // ===== FOOTER =====
      const footerY = doc.page.height - 60;
      doc.fontSize(8)
        .fillColor('#666666')
        .text(
          `Payment due by ${formatDate(data.due_date)}. Please reference invoice ${data.invoice_number} with your payment.`,
          50, 
          footerY, 
          { align: 'center', width: pageWidth }
        );

      doc.end();
    });
  },
};

// =====================================================
// HELPERS
// =====================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatIBAN(iban: string): string {
  // Remove spaces and format in groups of 4
  const cleaned = iban.replace(/\s/g, '');
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
}
