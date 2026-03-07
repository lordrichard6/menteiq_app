'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useInvoiceStore } from '@/stores/invoice-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'
import {
    ArrowLeft,
    FileText,
    MoreHorizontal,
    Send,
    CheckCircle,
    CreditCard,
    Copy,
    Trash2,
    Loader2,
} from 'lucide-react'
import type { InvoiceStatus } from '@/lib/types/schema'

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

export default function InvoiceDetailPage() {
    const params = useParams()
    const router = useRouter()
    const invoiceId = params.id as string

    const { invoices, fetchInvoice, markAsSent, markAsPaid, createPaymentLink, deleteInvoice, isLoading, error } =
        useInvoiceStore()

    const [actionLoading, setActionLoading] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)

    useEffect(() => {
        fetchInvoice(invoiceId)
    }, [invoiceId, fetchInvoice])

    const invoice = invoices.find(i => i.id === invoiceId)

    if (isLoading && !invoice) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-[#3D4A67]" />
                <span className="ml-2 text-slate-500">Loading invoice...</span>
            </div>
        )
    }

    if (error && !invoice) {
        return (
            <div className="text-center py-24">
                <p className="text-red-500 mb-2">Error loading invoice</p>
                <p className="text-sm text-slate-500">{error}</p>
                <Button variant="outline" onClick={() => fetchInvoice(invoiceId)} className="mt-4">
                    Retry
                </Button>
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

    const contactName = invoice.contact
        ? invoice.contact.is_company
            ? invoice.contact.company_name || '—'
            : [invoice.contact.first_name, invoice.contact.last_name].filter(Boolean).join(' ') || '—'
        : '—'

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
        setActionLoading(true)
        const success = await markAsPaid(invoice.id)
        setActionLoading(false)
        if (success) {
            toast.success('Invoice marked as paid')
        } else {
            toast.error(useInvoiceStore.getState().error ?? 'Failed to mark as paid')
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

    const handleDownloadPDF = () => {
        window.open(`/api/invoices/${invoice.id}/download`, '_blank')
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/invoices')}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Invoices
                    </Button>
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
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleDownloadPDF}
                        className="border-slate-300"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Download PDF
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" disabled={actionLoading}>
                                {actionLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {invoice.status === 'draft' && (
                                <DropdownMenuItem onClick={handleMarkAsSent}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Mark as Sent
                                </DropdownMenuItem>
                            )}

                            {(invoice.status === 'sent' || invoice.status === 'overdue') && (
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right w-20">Qty</TableHead>
                                    <TableHead className="text-right w-32">Unit Price</TableHead>
                                    <TableHead className="text-right w-20">Tax</TableHead>
                                    <TableHead className="text-right w-32">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoice.line_items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.description}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            {formatMoney(item.unit_price, invoice.currency)}
                                        </TableCell>
                                        <TableCell className="text-right">{item.tax_rate}%</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatMoney(item.line_total, invoice.currency)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
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
        </div>
    )
}
