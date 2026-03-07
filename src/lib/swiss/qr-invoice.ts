/**
 * Swiss QR-Bill Invoice Generator
 * 
 * Generates a Swiss invoice with QR-Bill payment slip.
 * The QR-Bill is automatically attached at the bottom of the page
 * following Swiss banking standards (ISO 20022).
 * 
 * Structure:
 * - Invoice header with creditor info
 * - Debtor address
 * - Invoice details
 * - Line items table
 * - Totals breakdown
 * - QR-Bill slip (A6 format at bottom)
 */

import { SwissQRBill } from 'swissqrbill/pdf';
import { PassThrough } from 'stream';
import type { InvoiceLineItem } from '@/lib/types/schema';

// =====================================================
// TYPES
// =====================================================

export interface CreditorInfo {
  name: string;
  address: string;
  zip: string;
  city: string;
  country: string;
  account: string; // IBAN
  vat_number?: string;
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

export interface SwissInvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  currency: 'CHF' | 'EUR';
  creditor: CreditorInfo;
  debtor: DebtorInfo;
  reference: string; // QR Reference (26 or 27 digits)
  line_items?: InvoiceLineItem[];
  subtotal?: number;
  tax_total?: number;
  notes?: string;
}

// =====================================================
// LEGACY INTERFACE (backward compatibility)
// =====================================================

interface LegacyInvoiceData {
  amount: number;
  currency: 'CHF' | 'EUR';
  debtor: {
    name: string;
    address: string;
    zip: string;
    city: string;
    country: string;
  };
  creditor: {
    name: string;
    address: string;
    zip: string;
    city: string;
    country: string;
    account: string;
  };
  reference: string;
}

// =====================================================
// SWISS INVOICE SERVICE
// =====================================================

export const SwissInvoiceService = {
  /**
   * Generate Swiss QR-Bill Invoice PDF
   * Supports both legacy simple format and new line items format
   */
  generatePDF(data: SwissInvoiceData | LegacyInvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Prepare data for SwissQRBill
      const qrBillData = {
        amount: data.amount,
        currency: data.currency,
        creditor: {
          name: data.creditor.name,
          address: data.creditor.address,
          zip: parseInt(data.creditor.zip) || 0,
          city: data.creditor.city,
          country: data.creditor.country,
          account: data.creditor.account,
        },
        debtor: {
          name: data.debtor.name,
          address: data.debtor.address,
          zip: parseInt(data.debtor.zip) || 0,
          city: data.debtor.city,
          country: data.debtor.country,
        },
        reference: data.reference.replace(/\s/g, ''), // Remove spaces
      };

      const pdf = new SwissQRBill(qrBillData);

      const stream = new PassThrough();
      const chunks: Buffer[] = [];

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err) => reject(err));

      // Check if this is the new format with line items
      const isDetailedInvoice = 'invoice_number' in data;

      if (isDetailedInvoice) {
        const invoiceData = data as SwissInvoiceData;
        renderDetailedInvoice(pdf, invoiceData);
      } else {
        // Legacy simple format
        renderSimpleInvoice(pdf, data as LegacyInvoiceData);
      }

      // Auto-attach QR Bill at the bottom (A6 format)
      pdf.addQRBill();

      pdf.pipe(stream);
      pdf.end();
    });
  },
};

// =====================================================
// RENDER FUNCTIONS
// =====================================================

function renderDetailedInvoice(pdf: SwissQRBill, data: SwissInvoiceData): void {
  const pageWidth = 495; // A4 width minus margins
  
  // ===== CREDITOR HEADER =====
  pdf.fontSize(16)
    .font('Helvetica-Bold')
    .text(data.creditor.name, 50, 50, { width: pageWidth });
  
  pdf.fontSize(9)
    .font('Helvetica')
    .text(data.creditor.address, 50, 70)
    .text(`${data.creditor.zip} ${data.creditor.city}`, 50, 81)
    .text(data.creditor.country, 50, 92);
  
  if (data.creditor.vat_number) {
    pdf.text(`MWST: ${data.creditor.vat_number}`, 50, 103);
  }

  // ===== INVOICE TITLE =====
  pdf.fontSize(20)
    .font('Helvetica-Bold')
    .text('RECHNUNG', 350, 50, { align: 'right', width: 195 });

  // ===== INVOICE DETAILS =====
  const detailsY = 85;
  pdf.fontSize(9)
    .font('Helvetica');
  
  pdf.text('Rechnungs-Nr:', 350, detailsY, { width: 90 });
  pdf.text(data.invoice_number, 440, detailsY, { width: 105, align: 'right' });
  
  pdf.text('Datum:', 350, detailsY + 12, { width: 90 });
  pdf.text(formatDate(data.invoice_date), 440, detailsY + 12, { width: 105, align: 'right' });
  
  pdf.text('Fällig am:', 350, detailsY + 24, { width: 90 });
  pdf.text(formatDate(data.due_date), 440, detailsY + 24, { width: 105, align: 'right' });

  // ===== DEBTOR INFO =====
  const billToY = 150;
  pdf.fontSize(10)
    .font('Helvetica-Bold')
    .text('Rechnungsadresse:', 50, billToY);
  
  pdf.fontSize(9)
    .font('Helvetica')
    .text(data.debtor.name, 50, billToY + 14)
    .text(data.debtor.address, 50, billToY + 25)
    .text(`${data.debtor.zip} ${data.debtor.city}`, 50, billToY + 36)
    .text(data.debtor.country, 50, billToY + 47);

  // ===== LINE ITEMS TABLE =====
  if (data.line_items && data.line_items.length > 0) {
    const tableTop = 230;
    const tableLeft = 50;
    const colWidths = {
      description: 200,
      qty: 50,
      unitPrice: 70,
      tax: 50,
      total: 75,
    };

    // Table header background
    pdf.rect(tableLeft, tableTop, pageWidth, 20)
      .fill('#e8e8e8');
    
    pdf.fillColor('#000000')
      .fontSize(8)
      .font('Helvetica-Bold');
    
    let xPos = tableLeft + 5;
    pdf.text('Beschreibung', xPos, tableTop + 6, { width: colWidths.description });
    xPos += colWidths.description;
    pdf.text('Menge', xPos, tableTop + 6, { width: colWidths.qty, align: 'right' });
    xPos += colWidths.qty;
    pdf.text('Preis', xPos, tableTop + 6, { width: colWidths.unitPrice, align: 'right' });
    xPos += colWidths.unitPrice;
    pdf.text('MWST', xPos, tableTop + 6, { width: colWidths.tax, align: 'right' });
    xPos += colWidths.tax;
    pdf.text('Total', xPos, tableTop + 6, { width: colWidths.total, align: 'right' });

    // Table rows
    pdf.font('Helvetica')
      .fontSize(8);
    
    let rowY = tableTop + 25;
    
    for (const item of data.line_items) {
      // Alternate row colors
      if (data.line_items.indexOf(item) % 2 === 1) {
        pdf.rect(tableLeft, rowY - 3, pageWidth, 16)
          .fill('#f8f8f8');
        pdf.fillColor('#000000');
      }

      xPos = tableLeft + 5;
      pdf.text(item.description, xPos, rowY, { width: colWidths.description });
      xPos += colWidths.description;
      pdf.text(item.quantity.toString(), xPos, rowY, { width: colWidths.qty, align: 'right' });
      xPos += colWidths.qty;
      pdf.text(formatMoney(item.unit_price, data.currency), xPos, rowY, { width: colWidths.unitPrice, align: 'right' });
      xPos += colWidths.unitPrice;
      pdf.text(`${item.tax_rate}%`, xPos, rowY, { width: colWidths.tax, align: 'right' });
      xPos += colWidths.tax;
      pdf.text(formatMoney(item.line_total, data.currency), xPos, rowY, { width: colWidths.total, align: 'right' });
      
      rowY += 16;
    }

    // Table border
    pdf.rect(tableLeft, tableTop, pageWidth, rowY - tableTop + 5)
      .stroke('#cccccc');

    // ===== TOTALS =====
    const totalsY = rowY + 15;
    const totalsLabelX = 350;
    const totalsValueX = 450;
    
    pdf.fontSize(9)
      .font('Helvetica');
    
    if (data.subtotal !== undefined) {
      pdf.text('Zwischensumme:', totalsLabelX, totalsY, { width: 90 });
      pdf.text(formatMoney(data.subtotal, data.currency), totalsValueX, totalsY, { width: 95, align: 'right' });
    }
    
    if (data.tax_total !== undefined) {
      pdf.text('MWST:', totalsLabelX, totalsY + 14, { width: 90 });
      pdf.text(formatMoney(data.tax_total, data.currency), totalsValueX, totalsY + 14, { width: 95, align: 'right' });
    }
    
    // Total line
    pdf.moveTo(totalsLabelX, totalsY + 30)
      .lineTo(545, totalsY + 30)
      .stroke('#000000');
    
    pdf.fontSize(11)
      .font('Helvetica-Bold')
      .text('Total:', totalsLabelX, totalsY + 36, { width: 90 });
    pdf.text(formatMoney(data.amount, data.currency), totalsValueX, totalsY + 36, { width: 95, align: 'right' });

    // ===== NOTES =====
    if (data.notes) {
      const notesY = totalsY + 65;
      pdf.fontSize(9)
        .font('Helvetica-Bold')
        .text('Bemerkungen:', 50, notesY);
      
      pdf.fontSize(8)
        .font('Helvetica')
        .text(data.notes, 50, notesY + 12, { width: pageWidth });
    }
  } else {
    // No line items - just show total
    pdf.fontSize(11)
      .font('Helvetica')
      .text(`Betrag: ${formatMoney(data.amount, data.currency)}`, 50, 230);
  }

  // Payment info - QR-Bill will be added at bottom automatically
  pdf.fontSize(8)
    .fillColor('#666666')
    .text(
      'Bitte verwenden Sie den untenstehenden Einzahlungsschein für die Zahlung.',
      50,
      540,
      { width: pageWidth }
    );
}

function renderSimpleInvoice(pdf: SwissQRBill, data: LegacyInvoiceData): void {
  // Legacy simple format
  pdf.fontSize(20).text('Invoice', 50, 50);
  pdf.fontSize(12).text(`Reference: ${data.reference}`, 50, 80);
  pdf.text(`Amount: ${data.currency} ${data.amount.toFixed(2)}`, 50, 100);

  pdf.text('Debtor:', 50, 150);
  pdf.text(data.debtor.name);
  pdf.text(data.debtor.address);
  pdf.text(`${data.debtor.zip} ${data.debtor.city}`);
}

// =====================================================
// HELPERS
// =====================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-CH', {
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
