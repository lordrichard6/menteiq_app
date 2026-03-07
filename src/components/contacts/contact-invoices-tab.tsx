'use client'

import { Contact } from '@/types/contact'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInvoiceStore } from '@/stores/invoice-store'
import { Plus, FileText, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

interface ContactInvoicesTabProps {
    contact: Contact
}

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-500',
}

const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
}

export function ContactInvoicesTab({ contact }: ContactInvoicesTabProps) {
    const router = useRouter()
    const invoices = useInvoiceStore((state) => state.invoices)
    const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all')

    // All invoices for this contact — used for total revenue (always unfiltered)
    const allContactInvoices = useMemo(
        () => invoices.filter(inv => inv.contact_id === contact.id),
        [invoices, contact.id]
    )

    // Filtered list for display
    const contactInvoices = useMemo(() => {
        if (filter === 'all') return allContactInvoices
        return allContactInvoices.filter(inv => inv.status === filter)
    }, [allContactInvoices, filter])

    // Total revenue always from ALL paid invoices, regardless of current filter
    const totalRevenue = useMemo(
        () =>
            allContactInvoices
                .filter(inv => inv.status === 'paid')
                .reduce((sum, inv) => sum + inv.amount_total, 0),
        [allContactInvoices]
    )

    return (
        <div className="space-y-4">
            {/* Header with filters and action */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                    {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map((f) => (
                        <Button
                            key={f}
                            variant={filter === f ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter(f)}
                            className={filter === f ? 'bg-[#3D4A67] hover:bg-[#2D3A57]' : ''}
                        >
                            {f === 'all' ? 'All' : STATUS_LABELS[f]}
                        </Button>
                    ))}
                </div>

                <Button
                    onClick={() => router.push(`/invoices/new?contact=${contact.id}`)}
                    className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white shrink-0"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Invoice
                </Button>
            </div>

            {/* Total Revenue — always reflects all paid invoices regardless of filter */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-sm text-slate-600">Total Revenue (Paid)</div>
                <div className="text-2xl font-bold text-[#3D4A67]">
                    CHF {totalRevenue.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                </div>
            </div>

            {/* Invoice List */}
            {contactInvoices.length > 0 ? (
                <div className="space-y-3">
                    {contactInvoices.map((invoice) => (
                        <Card
                            key={invoice.id}
                            role="link"
                            tabIndex={0}
                            className="border-slate-200 bg-white hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => router.push(`/invoices/${invoice.id}`)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    router.push(`/invoices/${invoice.id}`)
                                }
                            }}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <FileText className="h-5 w-5 text-slate-400" />
                                        <div>
                                            <div className="font-medium text-[#3D4A67]">
                                                {invoice.invoice_number}
                                            </div>
                                            <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                                <Calendar className="h-3 w-3" />
                                                {invoice.status === 'paid'
                                                    ? invoice.paid_at
                                                        ? `Paid: ${new Date(invoice.paid_at).toLocaleDateString('de-CH')}`
                                                        : 'Paid'
                                                    : `Due: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('de-CH') : 'N/A'}`
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-semibold text-[#3D4A67]">
                                                CHF {invoice.amount_total.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                                            </div>
                                            <Badge className={STATUS_COLORS[invoice.status] ?? 'bg-slate-100 text-slate-700'}>
                                                {STATUS_LABELS[invoice.status] ?? invoice.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>No invoices yet for this contact.</p>
                    <Button
                        onClick={() => router.push(`/invoices/new?contact=${contact.id}`)}
                        variant="outline"
                        className="mt-4"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Invoice
                    </Button>
                </div>
            )}
        </div>
    )
}
