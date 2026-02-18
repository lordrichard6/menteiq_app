'use client'

import { useInvoiceStore, InvoiceWithLineItems } from '@/stores/invoice-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateInvoiceDialog } from '@/components/modules/invoicing/create-invoice-dialog'
import { useState, useEffect } from 'react'
import { 
    Search, 
    Filter, 
    Trash2, 
    Loader2, 
    MoreHorizontal,
    FileText,
    CreditCard,
    CheckCircle,
    Send,
    ExternalLink,
    Copy
} from 'lucide-react'
import type { InvoiceStatus } from '@/lib/types/schema'

// Status labels and colors
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
        currency: currency,
        minimumFractionDigits: 2,
    }).format(amount)
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

function getContactName(invoice: InvoiceWithLineItems): string {
    if (!invoice.contact) return '-'
    if (invoice.contact.is_company) {
        return invoice.contact.company_name || 'Unknown Company'
    }
    const name = [invoice.contact.first_name, invoice.contact.last_name]
        .filter(Boolean)
        .join(' ')
    return name || invoice.contact.email || 'Unknown'
}

export default function InvoicesPage() {
    const { 
        invoices, 
        fetchInvoices, 
        deleteInvoice,
        markAsPaid,
        markAsSent,
        createPaymentLink,
        isLoading, 
        error 
    } = useInvoiceStore()
    
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // Fetch invoices on mount
    useEffect(() => {
        fetchInvoices()
    }, [fetchInvoices])

    const filteredInvoices = invoices.filter((invoice) => {
        const contactName = getContactName(invoice).toLowerCase()
        const matchesSearch =
            invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
            contactName.includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
        return matchesSearch && matchesStatus
    })

    // Calculate summary stats
    const stats = {
        total: invoices.length,
        draft: invoices.filter(i => i.status === 'draft').length,
        sent: invoices.filter(i => i.status === 'sent').length,
        paid: invoices.filter(i => i.status === 'paid').length,
        overdue: invoices.filter(i => i.status === 'overdue').length,
        totalAmount: invoices.reduce((sum, i) => sum + i.amount_total, 0),
        paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount_total, 0),
    }

    const handleDownloadPDF = (invoiceId: string) => {
        window.open(`/api/invoices/${invoiceId}/download`, '_blank')
    }

    const handleCreatePaymentLink = async (invoiceId: string) => {
        setActionLoading(invoiceId)
        const link = await createPaymentLink(invoiceId)
        setActionLoading(null)
        
        if (link) {
            // Copy to clipboard
            await navigator.clipboard.writeText(link)
            alert('Payment link copied to clipboard!')
        }
    }

    const handleMarkAsSent = async (invoiceId: string) => {
        setActionLoading(invoiceId)
        await markAsSent(invoiceId)
        setActionLoading(null)
    }

    const handleMarkAsPaid = async (invoiceId: string) => {
        setActionLoading(invoiceId)
        await markAsPaid(invoiceId)
        setActionLoading(null)
    }

    const handleDelete = async (invoiceId: string) => {
        if (confirm('Are you sure you want to delete this invoice?')) {
            await deleteInvoice(invoiceId)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#3D4A67]">Invoices</h1>
                    <p className="text-slate-600">Create and manage invoices with QR-Bill support</p>
                </div>
                <CreateInvoiceDialog />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-200 bg-white">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-[#3D4A67]">{stats.total}</div>
                        <p className="text-sm text-slate-500">Total Invoices</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
                        <p className="text-sm text-slate-500">Awaiting Payment</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
                        <p className="text-sm text-slate-500">Paid</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-[#3D4A67]">
                            {formatMoney(stats.paidAmount, 'CHF')}
                        </div>
                        <p className="text-sm text-slate-500">Revenue</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Search by invoice number or contact..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 border-slate-300">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Invoice Table */}
            <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle className="text-[#3D4A67]">All Invoices</CardTitle>
                    <CardDescription className="text-slate-600">
                        {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} total
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-[#3D4A67]" />
                            <span className="ml-2 text-slate-500">Loading invoices...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-500 mb-2">Error loading invoices</p>
                            <p className="text-sm text-slate-500">{error}</p>
                            <Button variant="outline" onClick={() => fetchInvoices()} className="mt-4">
                                Retry
                            </Button>
                        </div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="mx-auto h-12 w-12 text-slate-300" />
                            <p className="text-slate-500 mt-4">
                                {invoices.length === 0
                                    ? "No invoices yet. Create your first invoice to get started."
                                    : "No invoices match your search."
                                }
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInvoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium font-mono">
                                            {invoice.invoice_number}
                                        </TableCell>
                                        <TableCell>{getContactName(invoice)}</TableCell>
                                        <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                                        <TableCell>{formatDate(invoice.due_date)}</TableCell>
                                        <TableCell className="font-medium">
                                            {formatMoney(invoice.amount_total, invoice.currency)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal">
                                                {invoice.invoice_type === 'swiss_qr' ? 'Swiss QR' : 'EU SEPA'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={STATUS_COLORS[invoice.status]}>
                                                {STATUS_LABELS[invoice.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        disabled={actionLoading === invoice.id}
                                                    >
                                                        {actionLoading === invoice.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleDownloadPDF(invoice.id)}>
                                                        <FileText className="h-4 w-4 mr-2" />
                                                        Download PDF
                                                    </DropdownMenuItem>
                                                    
                                                    {invoice.stripe_payment_link && (
                                                        <DropdownMenuItem 
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(invoice.stripe_payment_link!)
                                                                alert('Payment link copied!')
                                                            }}
                                                        >
                                                            <Copy className="h-4 w-4 mr-2" />
                                                            Copy Payment Link
                                                        </DropdownMenuItem>
                                                    )}
                                                    
                                                    {!invoice.stripe_payment_link && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                                                        <DropdownMenuItem onClick={() => handleCreatePaymentLink(invoice.id)}>
                                                            <CreditCard className="h-4 w-4 mr-2" />
                                                            Create Payment Link
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuSeparator />
                                                    
                                                    {invoice.status === 'draft' && (
                                                        <DropdownMenuItem onClick={() => handleMarkAsSent(invoice.id)}>
                                                            <Send className="h-4 w-4 mr-2" />
                                                            Mark as Sent
                                                        </DropdownMenuItem>
                                                    )}
                                                    
                                                    {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                                                        <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                            Mark as Paid
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuSeparator />
                                                    
                                                    <DropdownMenuItem 
                                                        onClick={() => handleDelete(invoice.id)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
