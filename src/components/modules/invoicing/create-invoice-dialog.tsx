'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { useInvoiceStore, LineItemInput } from '@/stores/invoice-store';
import { calculateTotals } from '@/lib/invoices/totals';
import { getTaxRatesForCountry } from '@/lib/invoices/tax-rates';
import { FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { InvoiceType } from '@/lib/types/schema';

interface ContactOption {
    id: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
    is_company: boolean
    country: string
}

interface LineItem extends LineItemInput {
    id: string; // Temporary ID for UI
}

interface CreateInvoiceDialogProps {
    /** Pre-select a contact when the dialog opens */
    defaultContactId?: string
    /** Open the dialog immediately on mount */
    defaultOpen?: boolean
    /** Called whenever the open state changes */
    onOpenChange?: (open: boolean) => void
    /** Pre-fill line items (e.g. when duplicating an invoice) */
    defaultLineItems?: LineItem[]
    /** Pre-fill notes */
    defaultNotes?: string
    /** Pre-fill invoice type */
    defaultInvoiceType?: InvoiceType
    /** Pre-fill currency */
    defaultCurrency?: string
    /** If true, hide the trigger button (dialog is controlled externally) */
    noTrigger?: boolean
}

function generateTempId(): string {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const DEFAULT_LINE_ITEM: () => LineItem = () => ({
    id: generateTempId(),
    description: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 8.1, // Default Swiss VAT
    sort_order: 0,
});

export function CreateInvoiceDialog({
    defaultContactId,
    defaultOpen = false,
    onOpenChange: onOpenChangeProp,
    defaultLineItems,
    defaultNotes,
    defaultInvoiceType,
    defaultCurrency,
    noTrigger = false,
}: CreateInvoiceDialogProps = {}) {
    const [open, setOpen] = React.useState(defaultOpen);
    const [loading, setLoading] = React.useState(false);
    const [contacts, setContacts] = React.useState<ContactOption[]>([]);
    const [submitAttempted, setSubmitAttempted] = React.useState(false);

    // Form state
    const [contactId, setContactId] = React.useState(defaultContactId ?? '');
    const [invoiceType, setInvoiceType] = React.useState<InvoiceType>(defaultInvoiceType ?? 'swiss_qr');
    const [currency, setCurrency] = React.useState(defaultCurrency ?? 'CHF');
    const [dueDate, setDueDate] = React.useState('');
    const [notes, setNotes] = React.useState(defaultNotes ?? '');
    const [lineItems, setLineItems] = React.useState<LineItem[]>(defaultLineItems ?? [DEFAULT_LINE_ITEM()]);
    const [selectedCountry, setSelectedCountry] = React.useState(
        defaultInvoiceType === 'eu_sepa' ? 'DE' : 'CH'
    );

    const { addInvoice } = useInvoiceStore();
    const supabase = createClient();

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        onOpenChangeProp?.(next);
    };

    // Load contacts + org defaults when dialog opens
    React.useEffect(() => {
        const load = async () => {
            const { data } = await supabase
                .from('contacts')
                .select('id, first_name, last_name, company_name, is_company, country')
                .order('created_at', { ascending: false });
            setContacts(data || []);

            // Load org defaults (only if not pre-filled via props)
            if (!defaultCurrency || !defaultInvoiceType) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('tenant_id')
                        .eq('id', user.id)
                        .single();
                    if (profile?.tenant_id) {
                        const { data: org } = await supabase
                            .from('organizations')
                            .select('settings')
                            .eq('id', profile.tenant_id)
                            .single();
                        if (org?.settings) {
                            const settings = org.settings as Record<string, unknown>;
                            const billing = (settings.billing as Record<string, unknown>) ?? {};
                            const orgCurrency = billing.default_currency as string | undefined;
                            const orgTaxRate = billing.default_tax_rate as number | undefined;

                            if (!defaultCurrency && orgCurrency) {
                                setCurrency(orgCurrency);
                                // If org default is EUR, switch to eu_sepa
                                if (!defaultInvoiceType && orgCurrency === 'EUR') {
                                    setInvoiceType('eu_sepa');
                                    setSelectedCountry('DE');
                                }
                            }
                            if (orgTaxRate !== undefined) {
                                // Apply default tax rate to all line items
                                setLineItems(prev => prev.map(item => ({ ...item, tax_rate: orgTaxRate })));
                            }
                        }
                    }
                }
            }
        };
        if (open) {
            // Reset form first (respecting any pre-fill defaults passed by the parent)
            setContactId(defaultContactId ?? '');
            setInvoiceType(defaultInvoiceType ?? 'swiss_qr');
            setCurrency(defaultCurrency ?? 'CHF');
            setDueDate('');
            setNotes(defaultNotes ?? '');
            setLineItems(defaultLineItems ?? [DEFAULT_LINE_ITEM()]);
            setSelectedCountry(defaultInvoiceType === 'eu_sepa' ? 'DE' : 'CH');
            setSubmitAttempted(false);
            load();
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update currency based on invoice type
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
    const isContactMissing = submitAttempted && !contactId;
    const itemErrors = lineItems.map(item => ({
        description: submitAttempted && !item.description.trim(),
        unit_price:  submitAttempted && item.unit_price <= 0,
    }));

    // Line item handlers
    const addLineItem = () => {
        const newItem = DEFAULT_LINE_ITEM();
        newItem.sort_order = lineItems.length;
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

    const handleCreate = async () => {
        setSubmitAttempted(true);

        if (!contactId) {
            toast.error('Please select a contact');
            return;
        }

        if (lineItems.some(item => !item.description.trim() || item.unit_price <= 0)) {
            toast.error('Please fill in all line items with valid descriptions and prices');
            return;
        }

        setLoading(true);
        try {
            // Prepare line items (remove temp IDs)
            const preparedLineItems: LineItemInput[] = lineItems.map((item, index) => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate,
                sort_order: index,
            }));

            const invoice = await addInvoice({
                contact_id: contactId,
                currency,
                invoice_type: invoiceType,
                due_date: dueDate || null,
                notes: notes || null,
                line_items: preparedLineItems,
            });

            if (invoice) {
                toast.success('Invoice created successfully');
                window.open(`/api/invoices/${invoice.id}/download`, '_blank');
                handleOpenChange(false);
            } else {
                toast.error(useInvoiceStore.getState().error ?? 'Failed to create invoice');
            }
        } catch {
            toast.error('Failed to create invoice');
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
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {!noTrigger && (
                <DialogTrigger asChild>
                    <Button className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white">
                        <FileText className="mr-2 h-4 w-4" />
                        New Invoice
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#3D4A67]">Create Invoice</DialogTitle>
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

                    {/* Contact & Due Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Client (Bill To)</Label>
                            <Select value={contactId} onValueChange={setContactId}>
                                <SelectTrigger
                                    aria-label="Select client"
                                    className={isContactMissing ? 'border-red-400 focus:ring-red-400' : ''}
                                >
                                    <SelectValue placeholder="Select contact" />
                                </SelectTrigger>
                                <SelectContent>
                                    {contacts.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.is_company
                                                ? c.company_name
                                                : `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.company_name
                                            }
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {isContactMissing && (
                                <p className="text-xs text-red-500">Please select a contact</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Due Date</Label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                            />
                        </div>
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
                                            {/* Description - takes most space */}
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

                    {/* Submit */}
                    <Button
                        className="w-full bg-[#3D4A67] hover:bg-[#2D3A57]"
                        onClick={handleCreate}
                        disabled={loading}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Invoice & Download PDF
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
