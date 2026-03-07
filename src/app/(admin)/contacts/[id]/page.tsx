'use client'

import { useContactStore } from '@/stores/contact-store'
import { Contact, ContactStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/contact'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Edit, Trash2, Loader2, Download, AlertTriangle, SearchX, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { TagsInput } from '@/components/contacts/tags-input'
import { NotesSection } from '@/components/contacts/notes-section'
import { EditContactDialog } from '@/components/contacts/edit-contact-dialog'
import { ContactOverviewTab } from '@/components/contacts/contact-overview-tab'
import { ContactInvoicesTab } from '@/components/contacts/contact-invoices-tab'
import { ContactProjectsTab } from '@/components/contacts/contact-projects-tab'
import { ContactTasksTab } from '@/components/contacts/contact-tasks-tab'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from 'sonner'

export default function ContactDetailPage() {
    const params = useParams()
    const router = useRouter()
    const contactId = params.id as string

    // Subscribe to the contacts array directly for reactivity
    const contacts = useContactStore((state) => state.contacts)
    const updateStatus = useContactStore((state) => state.updateStatus)
    const deleteContact = useContactStore((state) => state.deleteContact)
    const fetchContactById = useContactStore((state) => state.fetchContactById)
    const isLoadingStore = useContactStore((state) => state.isLoading)

    const [contact, setContact] = useState<Contact | null>(null)
    const [isInternalLoading, setIsInternalLoading] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [gdprDelete, setGdprDelete] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Ref for click-outside detection on the export dropdown
    const exportMenuRef = useRef<HTMLDivElement>(null)

    // Close export menu when clicking outside or pressing Escape
    useEffect(() => {
        if (!showExportMenu) return
        const handleClick = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setShowExportMenu(false)
            }
        }
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowExportMenu(false)
        }
        document.addEventListener('mousedown', handleClick)
        document.addEventListener('keydown', handleKey)
        return () => {
            document.removeEventListener('mousedown', handleClick)
            document.removeEventListener('keydown', handleKey)
        }
    }, [showExportMenu])

    useEffect(() => {
        const loadContact = async () => {
            // First try to find in store
            const found = contacts.find(c => c.id === contactId)
            if (found) {
                setContact(found)
            } else {
                // Not in store (maybe not on current page), fetch individually
                setIsInternalLoading(true)
                const fetched = await fetchContactById(contactId)
                setContact(fetched)
                setIsInternalLoading(false)
            }
        }

        loadContact()
    }, [contactId, contacts, fetchContactById])

    const isLoading = isLoadingStore || isInternalLoading

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            if (gdprDelete) {
                // GDPR permanent deletion
                const response = await fetch(`/api/contacts/${contactId}/gdpr-delete`, {
                    method: 'DELETE',
                })
                const data = await response.json()

                if (response.ok) {
                    // Download deletion certificate
                    const blob = new Blob(
                        [JSON.stringify(data.deletion_certificate, null, 2)],
                        { type: 'application/json' }
                    )
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `deletion-certificate-${contactId}.json`
                    a.click()
                    URL.revokeObjectURL(url)

                    toast.success('Contact permanently deleted', {
                        description: 'A deletion certificate has been downloaded for GDPR compliance.',
                    })
                    router.push('/contacts')
                } else {
                    toast.error('Failed to delete contact', {
                        description: data.error || 'An unexpected error occurred.',
                    })
                }
            } else {
                // Regular soft delete (archive)
                await deleteContact(contactId)
                toast.success('Contact archived', {
                    description: 'The contact has been moved to the archive.',
                })
                router.push('/contacts')
            }
        } catch (error) {
            console.error('Delete error:', error)
            toast.error('Failed to delete contact', {
                description: 'An unexpected error occurred. Please try again.',
            })
        } finally {
            setIsDeleting(false)
            setShowDeleteDialog(false)
            setGdprDelete(false)
        }
    }

    const handleExport = (format: 'json' | 'csv') => {
        const url = `/api/contacts/${contactId}/export?format=${format}`
        const a = document.createElement('a')
        a.href = url
        a.download = `contact-${contactId}-export.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setShowExportMenu(false)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-[#3D4A67]" aria-label="Loading contact" />
                <span className="ml-2 text-slate-500">Loading contact...</span>
            </div>
        )
    }

    if (!contact) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <SearchX className="h-16 w-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-semibold text-slate-700 mb-2">Contact not found</h2>
                <p className="text-slate-500 mb-6">This contact may have been deleted or you don&apos;t have access.</p>
                <Link href="/contacts">
                    <Button variant="outline" className="border-slate-300">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Contacts
                    </Button>
                </Link>
            </div>
        )
    }

    // Generate avatar initials
    const displayName = contact.isCompany ? (contact.companyName || 'C') : `${contact.firstName} ${contact.lastName}`
    const initials = (contact.isCompany ? contact.companyName : `${contact.firstName} ${contact.lastName}`)
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?'

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Back Button */}
            <Link href="/contacts">
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Contacts
                </Button>
            </Link>

            {/* Contact Header */}
            <Card className="border-slate-200 bg-white shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="h-16 w-16 rounded-full bg-[#3D4A67] text-white flex items-center justify-center text-xl font-semibold shrink-0">
                                {initials}
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-2">
                                <h1 className="text-2xl sm:text-3xl font-bold text-[#3D4A67]">
                                    {contact.isCompany ? contact.companyName : `${contact.firstName} ${contact.lastName}`}
                                </h1>

                                {/* Status Selector */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <Select
                                        value={contact.status}
                                        onValueChange={(v) => updateStatus(contactId, v as ContactStatus)}
                                    >
                                        <SelectTrigger className="w-40 h-9" aria-label="Contact status">
                                            <Badge className={STATUS_COLORS[contact.status]}>
                                                {STATUS_LABELS[contact.status]}
                                            </Badge>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Tags Preview */}
                                    <div className="flex flex-wrap gap-1">
                                        {(contact.tags ?? []).slice(0, 3).map((tag) => (
                                            <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-700">
                                                {tag}
                                            </Badge>
                                        ))}
                                        {(contact.tags ?? []).length > 3 && (
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                                +{(contact.tags ?? []).length - 3}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 sm:shrink-0">
                            {/* Export menu with proper click-outside / keyboard handling */}
                            <div className="relative" ref={exportMenuRef}>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowExportMenu(prev => !prev)}
                                    aria-haspopup="menu"
                                    aria-expanded={showExportMenu}
                                    aria-label="Export contact data"
                                    className="border-slate-300"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Export Data
                                    <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
                                </Button>
                                {showExportMenu && (
                                    <div
                                        role="menu"
                                        aria-label="Export format options"
                                        className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-slate-200 z-20"
                                    >
                                        <button
                                            role="menuitem"
                                            onClick={() => handleExport('json')}
                                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
                                        >
                                            Export as JSON
                                        </button>
                                        <button
                                            role="menuitem"
                                            onClick={() => handleExport('csv')}
                                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-b-lg"
                                        >
                                            Export as CSV
                                        </button>
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setShowEditDialog(true)}
                                className="border-slate-300"
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowDeleteDialog(true)}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tab Navigation */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-slate-100">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <ContactOverviewTab contact={contact} />
                </TabsContent>

                <TabsContent value="invoices" className="mt-6">
                    <ContactInvoicesTab contact={contact} />
                </TabsContent>

                <TabsContent value="projects" className="mt-6">
                    <ContactProjectsTab contact={contact} />
                </TabsContent>

                <TabsContent value="tasks" className="mt-6">
                    <ContactTasksTab contact={contact} />
                </TabsContent>

                <TabsContent value="notes" className="mt-6">
                    <Card className="border-slate-200 bg-white shadow-sm">
                        <CardContent className="pt-6">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-[#3D4A67] mb-2">Tags</h3>
                                <TagsInput contactId={contactId} tags={contact.tags} />
                            </div>
                            <div className="border-t border-slate-200 pt-4 mt-4">
                                <h3 className="text-lg font-semibold text-[#3D4A67] mb-2">Notes</h3>
                                <NotesSection contactId={contactId} notes={contact.notes} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Edit Dialog */}
            <EditContactDialog
                contact={contact}
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
                setShowDeleteDialog(open)
                if (!open) setGdprDelete(false)
            }}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-red-600" />
                            Delete Contact?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>
                                Are you sure you want to delete <strong>{displayName}</strong>?
                            </p>

                            {/* GDPR Permanent Delete Option */}
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id="gdpr-delete"
                                        checked={gdprDelete}
                                        onCheckedChange={(checked) => setGdprDelete(checked as boolean)}
                                        className="mt-0.5"
                                    />
                                    <div className="flex-1">
                                        <label
                                            htmlFor="gdpr-delete"
                                            className="text-sm font-medium text-red-900 cursor-pointer flex items-center gap-2"
                                        >
                                            <AlertTriangle className="h-4 w-4" />
                                            GDPR Permanent Deletion
                                        </label>
                                        <p className="text-xs text-red-700 mt-1">
                                            Permanently delete ALL data related to this contact including invoices,
                                            tasks, projects, and activity history. This action{' '}
                                            <strong>cannot be undone</strong>. A deletion certificate will be
                                            generated for compliance.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {!gdprDelete && (
                                <p className="text-xs text-slate-500">
                                    Regular deletion archives the contact and preserves business records.
                                </p>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className={gdprDelete ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700'}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                gdprDelete ? 'Permanently Delete (GDPR)' : 'Delete'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
