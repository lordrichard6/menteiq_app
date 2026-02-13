'use client'

import { useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useInvoiceStore } from '@/stores/invoice-store'
import { useTimeStore } from '@/stores/time-store'
import { Wallet, Receipt, CheckCircle2, TrendingUp, BarChart3, Clock } from 'lucide-react'

interface ProjectBudgetStatsProps {
    projectId: string
    budgetAmount?: number
    currency?: string
}

const DEFAULT_HOURLY_RATE = 100 // CHF/hr (could be moved to project setting later)

export function ProjectBudgetStats({
    projectId,
    budgetAmount = 0,
    currency = 'CHF'
}: ProjectBudgetStatsProps) {
    const { invoices, fetchInvoices } = useInvoiceStore()
    const { timeEntries, fetchTimeEntries } = useTimeStore()

    useEffect(() => {
        fetchInvoices(projectId)
        fetchTimeEntries(projectId)
    }, [projectId, fetchInvoices, fetchTimeEntries])

    const stats = useMemo(() => {
        // Invoice stats
        const invoicedInvoices = invoices.filter(inv => inv.status !== 'draft')
        const paidInvoices = invoices.filter(inv => inv.status === 'paid')
        const totalInvoiced = invoicedInvoices.reduce((sum, inv) => sum + (inv.amount_total || 0), 0)
        const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.amount_total || 0), 0)

        // Time stats
        const totalMinutes = timeEntries.reduce((sum, entry) => sum + entry.duration_minutes, 0)
        const actualCost = (totalMinutes / 60) * DEFAULT_HOURLY_RATE
        const profitability = totalInvoiced - actualCost
        const profitMargin = totalInvoiced > 0 ? (profitability / totalInvoiced) * 100 : 0

        const utilization = budgetAmount > 0 ? (totalInvoiced / budgetAmount) * 100 : 0

        return {
            totalInvoiced,
            totalPaid,
            actualCost,
            profitability,
            profitMargin,
            utilization: Math.min(Math.round(utilization), 100),
            isOverBudget: totalInvoiced > budgetAmount && budgetAmount > 0
        }
    }, [invoices, timeEntries, budgetAmount])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('de-CH', {
            style: 'currency',
            currency: currency,
        }).format(amount)
    }

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-slate-50 flex flex-row items-center justify-between bg-slate-50/50">
                <div>
                    <CardTitle className="text-sm font-bold text-[#3D4A67]">Project Economics</CardTitle>
                    <CardDescription className="text-[11px]">Financial overview & profitability</CardDescription>
                </div>
                <TrendingUp className="h-4 w-4 text-[#9EAE8E]" />
            </CardHeader>
            <CardContent className="p-4 space-y-5">
                {/* Budget Utilization */}
                <div className="space-y-3">
                    <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Budget Used</span>
                            <span className={`text-xs font-bold ${stats.isOverBudget ? 'text-red-500' : 'text-[#3D4A67]'}`}>
                                {stats.utilization}%
                            </span>
                        </div>
                        <Progress
                            value={stats.utilization}
                            className={`h-1.5 ${stats.isOverBudget ? 'bg-red-100' : 'bg-slate-100'}`}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 px-1">
                        <div className="space-y-1">
                            <p className="text-[10px] font-medium text-slate-400 uppercase">Allocated</p>
                            <p className="text-sm font-bold text-[#3D4A67]">{formatCurrency(budgetAmount)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-medium text-slate-400 uppercase">Invoiced</p>
                            <p className={`text-sm font-bold ${stats.isOverBudget ? 'text-red-500' : 'text-[#3D4A67]'}`}>
                                {formatCurrency(stats.totalInvoiced)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Profitability Section */}
                <div className="pt-4 border-t border-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">Performance</span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${stats.profitability >= 0 ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 border-red-200 bg-red-50'}`}>
                            {Math.round(stats.profitMargin)}% Margin
                        </Badge>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-white shadow-inner">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-medium text-slate-400 uppercase">Gross Profit</span>
                            <span className={`text-sm font-bold ${stats.profitability >= 0 ? 'text-[#9EAE8E]' : 'text-red-400'}`}>
                                {stats.profitability >= 0 ? '+' : ''}{formatCurrency(stats.profitability)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Actual Cost (Labor)</span>
                            <span>{formatCurrency(stats.actualCost)}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Status */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#9EAE8E]" />
                        <span className="text-[11px] font-medium text-slate-500">Cash Received</span>
                    </div>
                    <span className="text-xs font-bold text-[#3D4A67]">{formatCurrency(stats.totalPaid)}</span>
                </div>
            </CardContent>
        </Card>
    )
}
