'use client'

import { Contact } from '@/types/contact'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useInvoiceStore } from '@/stores/invoice-store'
import { useProjectStore } from '@/stores/project-store'
import { PortalAccessSection } from './portal-access-section'
import { ActivityTimeline } from './activity-timeline'
import { ConsentManagement } from './consent-management'
import { Mail, Phone, Building2, FileText, FolderKanban, CheckSquare, MapPin, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'

interface ContactOverviewTabProps {
    contact: Contact
}

export function ContactOverviewTab({ contact }: ContactOverviewTabProps) {
    const router = useRouter()
    const invoices = useInvoiceStore((state) => state.invoices)
    const isLoadingInvoices = useInvoiceStore((state) => state.isLoading)
    const fetchInvoices = useInvoiceStore((state) => state.fetchInvoices)
    const projects = useProjectStore((state) => state.projects)
    const isLoadingProjects = useProjectStore((state) => state.isLoading)
    const fetchProjects = useProjectStore((state) => state.fetchProjects)

    // Ensure related stores are loaded for accurate stats
    useEffect(() => {
        if (invoices.length === 0 && !isLoadingInvoices) {
            fetchInvoices()
        }
        if (projects.length === 0 && !isLoadingProjects) {
            fetchProjects()
        }
    }, [])  // eslint-disable-line react-hooks/exhaustive-deps

    // Calculate stats
    const stats = useMemo(() => {
        const contactInvoices = invoices.filter(inv => inv.contact_id === contact.id)
        const contactProjects = projects.filter(proj => proj.clientId === contact.id)

        const totalRevenue = contactInvoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + inv.amount_total, 0)

        const openInvoices = contactInvoices.filter(inv =>
            inv.status === 'sent' || inv.status === 'overdue'
        ).length

        const activeProjects = contactProjects.filter(proj =>
            proj.status === 'active'
        ).length

        return { totalRevenue, openInvoices, activeProjects }
    }, [invoices, projects, contact.id])

    const isLoadingStats = isLoadingInvoices || isLoadingProjects

    // Build address string for display
    const addressParts = [
        contact.addressLine1,
        contact.addressLine2,
        [contact.postalCode, contact.city].filter(Boolean).join(' '),
        contact.country,
    ].filter(Boolean)
    const hasAddress = addressParts.length > 0

    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-label="Loading total revenue" />
                        ) : (
                            <div className="text-2xl font-bold text-[#3D4A67]">
                                CHF {stats.totalRevenue.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-slate-600">Open Invoices</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-label="Loading open invoices" />
                        ) : (
                            <div className="text-2xl font-bold text-[#3D4A67]">
                                {stats.openInvoices}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-slate-600">Active Projects</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-label="Loading active projects" />
                        ) : (
                            <div className="text-2xl font-bold text-[#3D4A67]">
                                {stats.activeProjects}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Contact Information */}
            <Card className="border-slate-200 bg-white">
                <CardHeader>
                    <CardTitle className="text-[#3D4A67]">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-xs text-slate-500 uppercase font-semibold">Type</span>
                            <div className="text-sm text-slate-700">{contact.isCompany ? 'Company' : 'Individual'}</div>
                        </div>
                        {contact.isCompany ? (
                            <div className="space-y-1">
                                <span className="text-xs text-slate-500 uppercase font-semibold">Company Name</span>
                                <div className="text-sm text-slate-700">{contact.companyName}</div>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <span className="text-xs text-slate-500 uppercase font-semibold">First Name</span>
                                    <div className="text-sm text-slate-700">{contact.firstName}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-slate-500 uppercase font-semibold">Last Name</span>
                                    <div className="text-sm text-slate-700">{contact.lastName || '-'}</div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-3">
                        {contact.email && (
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                                <a href={`mailto:${contact.email}`} className="text-slate-700 hover:text-[#3D4A67]">
                                    {contact.email}
                                </a>
                            </div>
                        )}
                        {contact.phone && (
                            <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                                <a href={`tel:${contact.phone}`} className="text-slate-700 hover:text-[#3D4A67]">
                                    {contact.phone}
                                </a>
                            </div>
                        )}
                        {!contact.isCompany && contact.companyName && (
                            <div className="flex items-center gap-3">
                                <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
                                <span className="text-slate-700">{contact.companyName}</span>
                            </div>
                        )}
                        {hasAddress && (
                            <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-slate-700 space-y-0.5">
                                    {addressParts.map((part, i) => (
                                        <div key={i}>{part}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Client Portal Access */}
            <PortalAccessSection contact={contact} />

            {/* Privacy & Consent */}
            <ConsentManagement
                contactId={contact.id}
                currentConsent={{
                    marketing_consent: contact.marketingConsent,
                    data_processing_consent: contact.dataProcessingConsent,
                    consent_date: contact.consentDate,
                    privacy_policy_version: undefined,
                }}
            />

            {/* Quick Actions */}
            <Card className="border-slate-200 bg-white">
                <CardHeader>
                    <CardTitle className="text-[#3D4A67]">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button
                        onClick={() => router.push(`/invoices/new?contact=${contact.id}`)}
                        className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        New Invoice
                    </Button>
                    <Button
                        onClick={() => router.push(`/projects/new?contact=${contact.id}`)}
                        variant="outline"
                        className="border-slate-300"
                    >
                        <FolderKanban className="h-4 w-4 mr-2" />
                        New Project
                    </Button>
                    <Button
                        onClick={() => router.push(`/tasks/new?contact=${contact.id}`)}
                        variant="outline"
                        className="border-slate-300"
                    >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        New Task
                    </Button>
                </CardContent>
            </Card>

            {/* Activity Timeline */}
            <ActivityTimeline contactId={contact.id} />
        </div>
    )
}
