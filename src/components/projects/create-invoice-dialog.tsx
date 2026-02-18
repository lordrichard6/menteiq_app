'use client'

import { useState } from 'react'
import { useInvoiceStore, LineItemInput } from '@/stores/invoice-store'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Plus, Trash2, FilePlus, Loader2 } from 'lucide-react'
import { InvoiceType } from '@/lib/types/schema'

interface CreateInvoiceDialogProps {
    projectId: string
    contactId: string | null
    buttonVariant?: "default" | "outline" | "ghost"
    buttonSize?: "default" | "sm" | "lg" | "icon"
    buttonClassName?: string
}

export function CreateInvoiceDialog({
    projectId,
    contactId,
    buttonVariant = "default",
    buttonSize = "sm",
    buttonClassName
}: CreateInvoiceDialogProps) {
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [invoiceType, setInvoiceType] = useState<InvoiceType>('swiss_qr')
    const [currency, setCurrency] = useState('CHF')
    const [dueDate, setDueDate] = useState('')
    const [notes, setNotes] = useState('')
    const [lineItems, setLineItems] = useState<LineItemInput[]>([
        { description: '', quantity: 1, unit_price: 0, tax_rate: 8.1 }
    ])

    const addInvoice = useInvoiceStore((state) => state.addInvoice)

    const handleAddLineItem = () => {
        setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, tax_rate: 8.1 }])
    }

    const handleRemoveLineItem = (index: number) => {
        if (lineItems.length > 1) {
            setLineItems(lineItems.filter((_, i) => i !== index))
        }
    }

    const handleLineItemChange = (index: number, field: keyof LineItemInput, value: any) => {
        const newItems = [...lineItems]
        newItems[index] = { ...newItems[index], [field]: value }
        setLineItems(newItems)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!contactId || isSubmitting) return

        setIsSubmitting(true)
        try {
            await addInvoice({
                contact_id: contactId,
                project_id: projectId,
                invoice_type: invoiceType,
                currency,
                due_date: dueDate || null,
                notes: notes || null,
                line_items: lineItems.filter(item => item.description.trim() !== '')
            })
            setOpen(false)
            // Reset form
            setInvoiceType('swiss_qr')
            setCurrency('CHF')
            setDueDate('')
            setNotes('')
            setLineItems([{ description: '', quantity: 1, unit_price: 0, tax_rate: 8.1 }])
        } catch (error) {
            console.error('Failed to create invoice:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={buttonVariant} size={buttonSize} className={buttonClassName}>
                    <FilePlus className="h-4 w-4 mr-2" />
                    New Invoice
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle className="text-[#3D4A67]">Create New Invoice</DialogTitle>
                        <DialogDescription>Generate an invoice for this project.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="invoice-type">Invoice Type</Label>
                            <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as InvoiceType)}>
                                <SelectTrigger id="invoice-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="swiss_qr">Swiss QR</SelectItem>
                                    <SelectItem value="eu_sepa">EU SEPA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency">Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger id="currency">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CHF">CHF</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="due-date">Due Date</Label>
                        <Input
                            id="due-date"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Line Items</Label>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddLineItem}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {lineItems.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end border-b border-slate-100 pb-3">
                                    <div className="col-span-6 space-y-1">
                                        {index === 0 && <Label className="text-[10px] uppercase text-slate-500">Description</Label>}
                                        <Input
                                            placeholder="Service or product..."
                                            value={item.description}
                                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        {index === 0 && <Label className="text-[10px] uppercase text-slate-500">Qty</Label>}
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value))}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        {index === 0 && <Label className="text-[10px] uppercase text-slate-500">Price</Label>}
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={(e) => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value))}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-400 hover:text-red-500"
                                            onClick={() => handleRemoveLineItem(index)}
                                            disabled={lineItems.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Input
                            id="notes"
                            placeholder="Additional information..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-[#9EAE8E] hover:bg-[#7E8E6E]" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Invoice'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
