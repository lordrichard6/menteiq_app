'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useInvoiceStore } from '@/stores/invoice-store'
import type { InvoiceWithLineItems } from '@/stores/invoice-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
    ChevronRight,
    FileText,
    MoreHorizontal,
    Send,
    CheckCircle,
    CreditCard,
    Copy,
    Trash2,
    Loader2,
    Pencil,
    Files,
    Ban,
    MapPin,
    Eye,
    X,
} from 'lucide-react'
import type { InvoiceStatus } from '@/lib/types/schema'
import { EditInvoiceDialog } from '@/components/modules/invoicing/edit-invoice-dialog'
import { CreateInvoiceDialog } from '@/components/modules/invoicing/create-invoice-dialog'

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<InvoiceStatus, string> = {
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
}

const STATUS_COLORS: Record<InvoiceStatus, string> = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount)
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

function buildDuplicateLineItems(invoice: InvoiceWithLineItems) {
    return invoice.line_items.map(item => ({
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        sort_order: item.sort_order,
    }))
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
    const params = useParams()
    const router = useRouter()
    const invoiceId = params.id as string

    const { invoices, fetchInvoice, markAsSent, markAsPaid, cancelInvoice, createPaymentLink, deleteInvoice, isLoading, error } =
        useInvoiceStore()

    const [actionLoading, setActionLoading] = useState(false)
    const [pdfLoading, setPdfLoading] = useState(false)
    const [showPdfPreview, setShowPdfPreview] = useState(false)

    // Dialog open states
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
    const [showCancelDialog, setShowCancelDialog] = useState(false)
    const [showPaidDialog, setShowPaidDialog] = useState(false)
    const [customPaidDate, setCustomPaidDate] = useState('')

    useEffect(() => {
        fetchInvoice(invoiceId)
    }, [invoiceId, fetchInvoice])

    const invoice = invoices.find(i => i.id === invoiceId)

    // ── Loading / error states ────────────────────────────────────────────────

    if (isLoading && !invoice) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-[#3D4A67]" />
                <span className="ml-2 text-slate-500">Loading invoice...</span>
            </div>
        )
    }

    if (error && !invoice) {
        const isNotFound = error === 'INVOICE_NOT_FOUND'
        return (
            <div className="text-center py-24">
                <FileText className="mx-auto h-12 w-12 text-slate-300" />
                <p className="text-red-500 mt-4 mb-1 font-medium">
                    {isNotFound ? 'Invoice not found' : 'Error loading invoice'}
                </p>
                {!isNotFound && (
                    <p className="text-sm text-slate-500 mb-4">{error}</p>
                )}
                <div className="flex gap-3 justify-center mt-4">
                    {!isNotFound && (
                        <Button variant="outline" onClick={() => fetchInvoice(invoiceId)}>
                            Retry
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => router.push('/invoices')}>
                        Back to Invoices
                    </Button>
                </div>
            </div>
        )
    }

    if (!invoice) {
        return (
            <div className="text-center py-24">
                <FileText className="mx-auto h-12 w-12 text-slate-300" />
                <p className="text-slate-500 mt-4">Invoice not found.</p>
                <Button variant="outline" onClick={() => router.push('/invoices')} className="mt-4">
                    Back to Invoices
                </Button>
            </div>
        )
    }

    // ── Derived values ────────────────────────────────────────────────────────

    const contactName = invoice.contact
        ? invoice.contact.is_company
            ? invoice.contact.company_name || '—'
            : [invoice.contact.first_name, invoice.contact.last_name].filter(Boolean).join(' ') || '—'
        : '—'

    const contactAddress = invoice.contact
        ? [
              invoice.contact.address_line1,
              invoice.contact.address_line2,
              [invoice.contact.postal_code, invoice.contact.city].filter(Boolean).join(' '),
              invoice.contact.state,
              invoice.contact.country,
          ].filter(Boolean).join(', ')
        : null

    const hasCompleteAddress = !!(
        invoice.contact?.address_line1 &&
        invoice.contact?.city &&
        invoice.contact?.postal_code
    )

    const canEdit    = invoice.status === 'draft'
    const canSend    = invoice.status === 'draft'
    const canPay     = invoice.status === 'sent' || invoice.status === 'overdue'
    const canCancel  = ['draft', 'sent', 'overdue'].includes(invoice.status)
    const canDuplicate = true // always allowed

    // ── Action handlers ───────────────────────────────────────────────────────

    const handleMarkAsSent = async () => {
        setActionLoading(true)
        const success = await markAsSent(invoice.id)
        setActionLoading(false)
        if (success) {
            toast.success('Invoice marked as sent')
        } else {
            toast.error(useInvoiceStore.getState().error ?? 'Failed to mark as sent')
        }
    }

    const handleMarkAsPaid = async () => {
        // Open the custom date dialog
        setCustomPaidDate(new Date().toISOString().split('T')[0])
        setShowPaidDialog(true)
    }

    const handleConfirmPaid = async () => {
        setShowPaidDialog(false)
        setActionLoading(true)
        const paidAt = customPaidDate
            ? new Date(customPaidDate).toISOString()
            : new Date().toISOString()
        const success = await markAsPaid(invoice.id, paidAt)
        setActionLoading(false)
        if (success) {
            toast.success('Invoice marked as paid')
        } else {
            toast.error(useInvoiceStore.getState().error ?? 'Failed to mark as paid')
        }
    }

    const handleCancelInvoice = async () => {
        setShowCancelDialog(false)
        setActionLoading(true)
        const success = await cancelInvoice(invoice.id)
        setActionLoading(false)
        if (success) {
            toast.success('Invoice cancelled')
        } else {
            toast.error(useInvoiceStore.getState().error ?? 'Failed to cancel invoice')
        }
    }

    const handleCreatePaymentLink = async () => {
        setActionLoading(true)
        const link = await createPaymentLink(invoice.id)
        setActionLoading(false)
        if (link) {
            await navigator.clipboard.writeText(link)
            toast.success('Payment link created and copied to clipboard')
        } else {
            toast.error(useInvoiceStore.getState().error ?? 'Failed to create payment link')
        }
    }

    const handleDelete = async () => {
        setActionLoading(true)
        const success = await deleteInvoice(invoice.id)
        setActionLoading(false)
        if (success) {
            setShowDeleteDialog(false)
            toast.success('Invoice deleted')
            router.push('/invoices')
        } else {
            toast.error(useInvoiceStore.getState().error ?? 'Failed to delete invoice')
        }
    }

    const handleDownloadPDF = async () => {
        // Pre-flight: check contact has address for PDF generation
        if (!hasCompleteAddress) {
            toast.error(
                'Cannot generate PDF: contact is missing address (street, city, postal code). Please update the contact first.',
                { duration: 6000 }
            )
            return
        }

        setPdfLoading(true)
        try {
            window.open(`/api/invoices/${invoice.id}/download`, '_blank')
        } finally {
            // Small delay so the button shows loading during the new tab open
            setTimeout(() => setPdfLoading(false), 1500)
        }
    }

    // ── JSX ───────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
                <Link href="/invoices" className="hover:text-slate-700 transition-colors">
                    Invoices
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-slate-800 font-medium font-mono">{invoice.invoice_number}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-[#3D4A67] font-mono">
                            {invoice.invoice_number}
                        </h1>
                        <Badge className={STATUS_COLORS[invoice.status]}>
                            {STATUS_LABELS[invoice.status]}
                        </Badge>
                    </div>
                    <p className="text-slate-500 text-sm mt-0.5">{contactName}</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (!hasCompleteAddress) {
                                toast.error(
                                    'Cannot preview PDF: contact is missing address (street, city, postal code). Please update the contact first.',
                                    { duration: 6000 }
                                )
                                return
                            }
                            setShowPdfPreview(true)
                        }}
                        className="border-slate-300"
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview PDF
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleDownloadPDF}
                        disabled={pdfLoading}
                        className="border-slate-300"
                    >
                        {pdfLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <FileText className="h-4 w-4 mr-2" />
                        )}
                        Download PDF
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                disabled={actionLoading}
                                aria-label="Invoice actions"
                            >
                                {actionLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {canEdit && (
                                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit Invoice
                                </DropdownMenuItem>
                            )}

                            {canDuplicate && (
                                <DropdownMenuItem onClick={() => setShowDuplicateDialog(true)}>
                                    <Files className="h-4 w-4 mr-2" />
                                    Duplicate Invoice
                                </DropdownMenuItem>
                            )}

                            {canSend && (
                                <DropdownMenuItem onClick={handleMarkAsSent}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Mark as Sent
                                </DropdownMenuItem>
                            )}

                            {canPay && (
                                <DropdownMenuItem onClick={handleMarkAsPaid}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Paid
                                </DropdownMenuItem>
                            )}

                            {invoice.stripe_payment_link && (
                                <DropdownMenuItem
                                    onClick={async () => {
                                        await navigator.clipboard.writeText(invoice.stripe_payment_link!)
                                        toast.success('Payment link copied')
                                    }}
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Payment Link
                                </DropdownMenuItem>
                            )}

                            {!invoice.stripe_payment_link && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                                <DropdownMenuItem onClick={handleCreatePaymentLink}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Create Payment Link
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {canCancel && (
                                <DropdownMenuItem
                                    onClick={() => setShowCancelDialog(true)}
                                    className="text-amber-600"
                                >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Cancel Invoice
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                                onClick={() => setShowDeleteDialog(true)}
                                className="text-red-600"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Invoice
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Details + Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            Invoice Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Contact</span>
                            <span className="font-medium text-[#3D4A67]">{contactName}</span>
                        </div>

                        {/* Contact address */}
                        {contactAddress ? (
                            <div className="flex justify-between text-sm gap-4">
                                <span className="text-slate-500 flex items-center gap-1 shrink-0">
                                    <MapPin className="h-3 w-3" /> Address
                                </span>
                                <span className="text-slate-600 text-right">{contactAddress}</span>
                            </div>
                        ) : (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> Address
                                </span>
                                <span className="text-amber-500 text-xs font-medium">
                                    Missing — PDF may fail
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Invoice Type</span>
                            <span className="font-medium">
                                {invoice.invoice_type === 'swiss_qr' ? 'Swiss QR-Bill' : 'EU SEPA'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Issue Date</span>
                            <span className="font-medium">{formatDate(invoice.invoice_date)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Due Date</span>
                            <span className="font-medium">{formatDate(invoice.due_date)}</span>
                        </div>
                        {invoice.status === 'paid' && invoice.paid_at && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Paid On</span>
                                <span className="font-medium text-green-600">{formatDate(invoice.paid_at)}</span>
                            </div>
                        )}
                        {invoice.qr_reference && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">QR Reference</span>
                                <span className="font-mono text-xs text-slate-600">{invoice.qr_reference}</span>
                            </div>
                        )}
                        {invoice.stripe_payment_link && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Payment Link</span>
                                <a
                                    href={invoice.stripe_payment_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-xs"
                                >
                                    Open link
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            Financial Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Subtotal</span>
                            <span className="font-medium">{formatMoney(invoice.subtotal ?? 0, invoice.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">VAT / Tax</span>
                            <span className="font-medium">{formatMoney(invoice.tax_total ?? 0, invoice.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
                            <span className="font-semibold text-[#3D4A67]">Total</span>
                            <span className="font-bold text-lg text-[#3D4A67]">
                                {formatMoney(invoice.amount_total, invoice.currency)}
                            </span>
                        </div>
                        {invoice.status === 'paid' && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-center text-sm text-green-700 font-medium">
                                ✓ Paid
                            </div>
                        )}
                        {invoice.status === 'cancelled' && (
                            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-center text-sm text-gray-500 font-medium">
                                Cancelled
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Line Items */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                        Line Items
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {invoice.line_items.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-6">No line items</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right w-20">Qty</TableHead>
                                        <TableHead className="text-right w-32">Unit Price</TableHead>
                                        <TableHead className="text-right w-20">Tax %</TableHead>
                                        <TableHead className="text-right w-32">Tax Amt</TableHead>
                                        <TableHead className="text-right w-32">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoice.line_items.map((item) => {
                                        const lineSubtotal = item.quantity * item.unit_price
                                        const taxAmount = lineSubtotal * (item.tax_rate / 100)
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.description}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatMoney(item.unit_price, invoice.currency)}
                                                </TableCell>
                                                <TableCell className="text-right">{item.tax_rate}%</TableCell>
                                                <TableCell className="text-right text-slate-500">
                                                    {formatMoney(taxAmount, invoice.currency)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatMoney(item.line_total, invoice.currency)}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Notes */}
            {invoice.notes && (
                <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            Notes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
                    </CardContent>
                </Card>
            )}

            {/* ── Dialogs ─────────────────────────────────────────────────────── */}

            {/* Edit Invoice */}
            {showEditDialog && (
                <EditInvoiceDialog
                    invoice={invoice}
                    open={showEditDialog}
                    onOpenChange={setShowEditDialog}
                />
            )}

            {/* Duplicate Invoice (CreateInvoiceDialog pre-filled, no trigger button) */}
            {showDuplicateDialog && (
                <CreateInvoiceDialog
                    noTrigger
                    defaultOpen
                    defaultContactId={invoice.contact_id ?? undefined}
                    defaultInvoiceType={invoice.invoice_type}
                    defaultCurrency={invoice.currency}
                    defaultNotes={invoice.notes ?? undefined}
                    defaultLineItems={buildDuplicateLineItems(invoice)}
                    onOpenChange={(open) => {
                        if (!open) setShowDuplicateDialog(false)
                    }}
                />
            )}

            {/* Mark as Paid — custom date dialog */}
            <Dialog open={showPaidDialog} onOpenChange={setShowPaidDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Mark as Paid</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label htmlFor="paid-date">Payment Date</Label>
                        <Input
                            id="paid-date"
                            type="date"
                            value={customPaidDate}
                            onChange={e => setCustomPaidDate(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPaidDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleConfirmPaid}
                            disabled={!customPaidDate}
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirm Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Confirmation */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Invoice</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel invoice <strong>{invoice.invoice_number}</strong>?
                            The invoice will be marked as cancelled but not deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Back</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelInvoice}
                            disabled={actionLoading}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {actionLoading ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-2 inline" />Cancelling...</>
                            ) : (
                                'Cancel Invoice'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete invoice <strong>{invoice.invoice_number}</strong>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={actionLoading}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {actionLoading ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-2 inline" />Deleting...</>
                            ) : (
                                'Delete'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* PDF Preview */}
            {showPdfPreview && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#3D4A67] text-white shrink-0">
                        <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 opacity-70" />
                            <span className="font-mono text-sm font-medium">{invoice.invoice_number}.pdf</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-white hover:bg-white/10"
                                onClick={handleDownloadPDF}
                                disabled={pdfLoading}
                            >
                                {pdfLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                ) : (
                                    <FileText className="h-4 w-4 mr-1.5" />
                                )}
                                Download
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-white hover:bg-white/10"
                                onClick={() => setShowPdfPreview(false)}
                            >
                                <X className="h-4 w-4 mr-1.5" />
                                Close
                            </Button>
                        </div>
                    </div>

                    {/* PDF iframe */}
                    <div className="flex-1 bg-slate-700 overflow-hidden">
                        <iframe
                            src={`/api/invoices/${invoice.id}/download?preview=true`}
                            className="w-full h-full border-0"
                            title={`Preview ${invoice.invoice_number}`}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
