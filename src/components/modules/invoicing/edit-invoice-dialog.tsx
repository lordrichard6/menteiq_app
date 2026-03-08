'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useInvoiceStore, LineItemInput } from '@/stores/invoice-store';
import type { InvoiceWithLineItems } from '@/stores/invoice-store';
import { calculateTotals } from '@/lib/invoices/totals';
import { getTaxRatesForCountry } from '@/lib/invoices/tax-rates';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { InvoiceType } from '@/lib/types/schema';

interface LineItem extends LineItemInput {
    id: string; // Temporary ID for UI
}

interface EditInvoiceDialogProps {
    invoice: InvoiceWithLineItems;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function generateTempId(): string {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function EditInvoiceDialog({ invoice, open, onOpenChange }: EditInvoiceDialogProps) {
    const [loading, setLoading] = React.useState(false);
    const [submitAttempted, setSubmitAttempted] = React.useState(false);

    // Form state — pre-filled from invoice
    const [invoiceType, setInvoiceType] = React.useState<InvoiceType>(invoice.invoice_type);
    const [currency, setCurrency] = React.useState(invoice.currency);
    const [dueDate, setDueDate] = React.useState(invoice.due_date ?? '');
    const [notes, setNotes] = React.useState(invoice.notes ?? '');
    const [lineItems, setLineItems] = React.useState<LineItem[]>(() =>
        invoice.line_items.length > 0
            ? invoice.line_items.map(item => ({
                  id: generateTempId(),
                  description: item.description,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  tax_rate: item.tax_rate,
                  sort_order: item.sort_order,
              }))
            : [{
                  id: generateTempId(),
                  description: '',
                  quantity: 1,
                  unit_price: 0,
                  tax_rate: 8.1,
                  sort_order: 0,
              }]
    );
    const [selectedCountry, setSelectedCountry] = React.useState(
        invoice.contact?.country ?? (invoice.invoice_type === 'swiss_qr' ? 'CH' : 'DE')
    );

    const { updateInvoice } = useInvoiceStore();

    // Re-sync form when invoice changes (e.g. after a refetch)
    React.useEffect(() => {
        if (open) {
            setInvoiceType(invoice.invoice_type);
            setCurrency(invoice.currency);
            setDueDate(invoice.due_date ?? '');
            setNotes(invoice.notes ?? '');
            setLineItems(
                invoice.line_items.length > 0
                    ? invoice.line_items.map(item => ({
                          id: generateTempId(),
                          description: item.description,
                          quantity: item.quantity,
                          unit_price: item.unit_price,
                          tax_rate: item.tax_rate,
                          sort_order: item.sort_order,
                      }))
                    : [{
                          id: generateTempId(),
                          description: '',
                          quantity: 1,
                          unit_price: 0,
                          tax_rate: 8.1,
                          sort_order: 0,
                      }]
            );
            setSelectedCountry(
                invoice.contact?.country ?? (invoice.invoice_type === 'swiss_qr' ? 'CH' : 'DE')
            );
            setSubmitAttempted(false);
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update currency when invoice type changes
    React.useEffect(() => {
        if (invoiceType === 'swiss_qr') {
            setCurrency('CHF');
            setSelectedCountry('CH');
        } else {
            setCurrency('EUR');
            setSelectedCountry('DE');
        }
    }, [invoiceType]);

    // Calculate totals
    const totals = React.useMemo(() => calculateTotals(lineItems), [lineItems]);

    // Get tax rates for selected country
    const taxRates = getTaxRatesForCountry(selectedCountry);

    // Inline validation state
    const itemErrors = lineItems.map(item => ({
        description: submitAttempted && !item.description.trim(),
        unit_price: submitAttempted && item.unit_price <= 0,
    }));

    // Line item handlers
    const addLineItem = () => {
        const newItem: LineItem = {
            id: generateTempId(),
            description: '',
            quantity: 1,
            unit_price: 0,
            tax_rate: taxRates[0]?.rate ?? 8.1,
            sort_order: lineItems.length,
        };
        setLineItems([...lineItems, newItem]);
    };

    const removeLineItem = (id: string) => {
        if (lineItems.length > 1) {
            setLineItems(lineItems.filter(item => item.id !== id));
        }
    };

    const updateLineItem = (id: string, field: keyof LineItemInput, value: string | number) => {
        setLineItems(lineItems.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const handleSave = async () => {
        setSubmitAttempted(true);

        if (lineItems.some(item => !item.description.trim() || item.unit_price <= 0)) {
            toast.error('Please fill in all line items with valid descriptions and prices');
            return;
        }

        setLoading(true);
        try {
            const preparedLineItems: LineItemInput[] = lineItems.map((item, index) => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate,
                sort_order: index,
            }));

            await updateInvoice(
                invoice.id,
                {
                    currency,
                    invoice_type: invoiceType,
                    due_date: dueDate || null,
                    notes: notes || null,
                },
                preparedLineItems
            );

            const storeError = useInvoiceStore.getState().error;
            if (storeError) {
                toast.error(storeError);
            } else {
                toast.success('Invoice updated successfully');
                onOpenChange(false);
            }
        } catch {
            toast.error('Failed to update invoice');
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('de-CH', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#3D4A67]">
                        Edit Invoice — {invoice.invoice_number}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Invoice Type & Currency */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Invoice Type</Label>
                            <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as InvoiceType)}>
                                <SelectTrigger aria-label="Invoice type">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="swiss_qr">Swiss QR-Bill (CHF)</SelectItem>
                                    <SelectItem value="eu_sepa">EU SEPA Invoice (EUR)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger aria-label="Currency">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Input
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className="max-w-xs"
                        />
                    </div>

                    {/* Line Items */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Line Items</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addLineItem}
                            >
                                <Plus className="h-4 w-4 mr-1" /> Add Item
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {lineItems.map((item, index) => (
                                <Card
                                    key={item.id}
                                    className={`border-slate-200 ${itemErrors[index]?.description || itemErrors[index]?.unit_price ? 'border-red-200' : ''}`}
                                >
                                    <CardContent className="pt-4">
                                        <div className="grid grid-cols-12 gap-3 items-end">
                                            {/* Description */}
                                            <div className="col-span-5 space-y-1">
                                                {index === 0 && <Label className="text-xs text-slate-500">Description</Label>}
                                                <Input
                                                    placeholder="Service or product"
                                                    value={item.description}
                                                    onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                                                    className={itemErrors[index]?.description ? 'border-red-400' : ''}
                                                />
                                                {itemErrors[index]?.description && (
                                                    <p className="text-xs text-red-500">Description required</p>
                                                )}
                                            </div>

                                            {/* Quantity */}
                                            <div className="col-span-2 space-y-1">
                                                {index === 0 && <Label className="text-xs text-slate-500">Qty</Label>}
                                                <Input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={item.quantity}
                                                    onChange={e => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>

                                            {/* Unit Price */}
                                            <div className="col-span-2 space-y-1">
                                                {index === 0 && <Label className="text-xs text-slate-500">Price</Label>}
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.unit_price}
                                                    onChange={e => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                                    className={itemErrors[index]?.unit_price ? 'border-red-400' : ''}
                                                />
                                                {itemErrors[index]?.unit_price && (
                                                    <p className="text-xs text-red-500">Must be &gt; 0</p>
                                                )}
                                            </div>

                                            {/* Tax Rate */}
                                            <div className="col-span-2 space-y-1">
                                                {index === 0 && <Label className="text-xs text-slate-500">Tax</Label>}
                                                <Select
                                                    value={item.tax_rate.toString()}
                                                    onValueChange={v => updateLineItem(item.id, 'tax_rate', parseFloat(v))}
                                                >
                                                    <SelectTrigger aria-label={`Tax rate for item ${index + 1}`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {taxRates.map(rate => (
                                                            <SelectItem key={rate.rate} value={rate.rate.toString()}>
                                                                {rate.rate}%
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Delete button */}
                                            <div className="col-span-1">
                                                {lineItems.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => removeLineItem(item.id)}
                                                        aria-label="Remove line item"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Line total */}
                                        <div className="text-right mt-2 text-sm text-slate-500">
                                            Line total: {formatMoney(item.quantity * item.unit_price)}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="border-t pt-4">
                        <div className="flex justify-end">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Subtotal:</span>
                                    <span>{formatMoney(totals.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">VAT:</span>
                                    <span>{formatMoney(totals.tax_total)}</span>
                                </div>
                                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                                    <span>Total:</span>
                                    <span className="text-[#3D4A67]">{formatMoney(totals.amount_total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notes (optional)</Label>
                        <Textarea
                            placeholder="Additional notes for the invoice..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-[#3D4A67] hover:bg-[#2D3A57]"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
