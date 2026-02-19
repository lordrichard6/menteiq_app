
import PDFDocument from 'pdfkit';
import { SwissQRBill } from './swiss-qr';
import type { InvoiceWithLineItems } from '@/stores/invoice-store';

export async function generateInvoicePDF(invoice: InvoiceWithLineItems, settings: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Uint8Array[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // Organization details
        const billing = settings?.billing || {};

        // Header
        doc.fontSize(20).text('INVOICE', { align: 'right' });
        doc.fontSize(10).text(invoice.invoice_number, { align: 'right' });

        // Company Logo/Name
        doc.fontSize(16).text(billing.company_name || 'MenteIQ User', 50, 50);
        doc.fontSize(10)
            .text(billing.address_line1 || '')
            .text(`${billing.postal_code || ''} ${billing.city || ''}`)
            .text(billing.country || '');

        doc.moveDown();

        // Client Details
        const contact = invoice.contact;
        const clientName = contact?.is_company ? contact.company_name : `${contact?.first_name} ${contact?.last_name}`.trim();

        doc.text('Bill To:', 50, 150);
        doc.font('Helvetica-Bold').text(clientName || 'Valued Client');
        doc.font('Helvetica');
        // Add client address if available

        // Invoice Meta
        doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 400, 150, { align: 'right' });
        if (invoice.due_date) {
            doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 400, 165, { align: 'right' });
        }

        // Line Items
        let y = 250;
        doc.font('Helvetica-Bold');
        doc.text('Description', 50, y);
        doc.text('Qty', 280, y, { width: 50, align: 'right' });
        doc.text('Price', 330, y, { width: 70, align: 'right' });
        doc.text('Total', 400, y, { width: 90, align: 'right' });

        doc.moveTo(50, y + 15).lineTo(500, y + 15).stroke();
        y += 25;
        doc.font('Helvetica');

        invoice.line_items.forEach(item => {
            doc.text(item.description, 50, y);
            doc.text(item.quantity.toString(), 280, y, { width: 50, align: 'right' });
            doc.text(item.unit_price.toFixed(2), 330, y, { width: 70, align: 'right' });
            doc.text((item.quantity * item.unit_price).toFixed(2), 400, y, { width: 90, align: 'right' });
            y += 20;
        });

        // Totals
        y += 20;
        doc.moveTo(350, y).lineTo(500, y).stroke();
        y += 10;

        doc.text('Subtotal:', 300, y, { width: 100, align: 'right' });
        doc.text((invoice.subtotal ?? 0).toFixed(2), 400, y, { width: 90, align: 'right' });
        y += 15;

        doc.text(`VAT:`, 300, y, { width: 100, align: 'right' });
        doc.text((invoice.tax_total ?? 0).toFixed(2), 400, y, { width: 90, align: 'right' });
        y += 15;

        doc.font('Helvetica-Bold');
        doc.text(`Total ${invoice.currency}:`, 300, y, { width: 100, align: 'right' });
        doc.text(invoice.amount_total.toFixed(2), 400, y, { width: 90, align: 'right' });

        // Swiss QR Section
        if (invoice.invoice_type === 'swiss_qr') {
            // Create QR Bill instance
            const qrBill = new SwissQRBill({
                currency: invoice.currency as 'CHF' | 'EUR',
                amount: invoice.amount_total,
                reference: invoice.qr_reference || '',
                debtor: {
                    name: clientName || 'Unknown',
                    address: (contact as any)?.address_line1 || 'Unknown',
                    zip: (contact as any)?.postal_code || '0000',
                    city: (contact as any)?.city || 'Unknown',
                    country: (contact as any)?.country || 'CH'
                },
                creditor: {
                    name: billing.company_name || 'My Company',
                    address: billing.address_line1 || 'My Address',
                    zip: billing.postal_code || '1000',
                    city: billing.city || 'Zurich',
                    country: billing.country || 'CH',
                    account: (billing.iban || '').replace(/\s/g, '')
                },
                message: `Invoice ${invoice.invoice_number}`
            });

            // Apply to current page bottom
            qrBill.attachTo(doc);
        }

        doc.end();
    });
}
