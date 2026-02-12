'use client'

import { useContactStore } from '@/stores/contact-store'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Edit, Trash2, Loader2, Download, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { STATUS_LABELS, STATUS_COLORS, ContactStatus } from '@/types/contact'
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

export default function ContactDetailPage() {
    const params = useParams()
    const router = useRouter()
    const contactId = params.id as string

    // Subscribe to the contacts array directly for reactivity
    const contacts = useContactStore((state) => state.contacts)
    const updateStatus = useContactStore((state) => state.updateStatus)
    const deleteContact = useContactStore((state) => state.deleteContact)
    const fetchContacts = useContactStore((state) => state.fetchContacts)
    const isLoading = useContactStore((state) => state.isLoading)

    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [gdprDelete, setGdprDelete] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Fetch contacts on mount if needed
    useEffect(() => {
        if (contacts.length === 0) {
            fetchContacts()
        }
    }, [contacts.length, fetchContacts])

    // Find contact from the reactive contacts array
    const contact = contacts.find(c => c.id === contactId)

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

                    router.push('/contacts')
                } else {
                    alert('Failed to delete contact: ' + data.error)
                }
            } else {
                // Regular deletion
                await deleteContact(contactId)
                router.push('/contacts')
            }
        } catch (error) {
            console.error('Delete error:', error)
            alert('Failed to delete contact')
        } finally {
            setIsDeleting(false)
            setShowDeleteDialog(false)
            setGdprDelete(false)
        }
    }

    const handleExport = (format: 'json' | 'csv') => {
        const url = `/api/contacts/${contactId}/export?format=${format}`
        window.open(url, '_blank')
        setShowExportMenu(false)
    }

    if (isLoading || !contact) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-[#3D4A67]" />
                <span className="ml-2 text-slate-500">Loading contact...</span>
            </div>
        )
    }

    // Generate avatar initials
    const initials = contact.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

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
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="h-16 w-16 rounded-full bg-[#3D4A67] text-white flex items-center justify-center text-xl font-semibold">
                                {initials}
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold text-[#3D4A67]">{contact.name}</h1>

                                {/* Status Selector */}
                                <div className="flex items-center gap-3">
                                    <Select
                                        value={contact.status}
                                        onValueChange={(v) => updateStatus(contactId, v as ContactStatus)}
                                    >
                                        <SelectTrigger className="w-40 h-9">
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
                                        {contact.tags.slice(0, 3).map((tag) => (
                                            <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-700">
                                                {tag}
                                            </Badge>
                                        ))}
                                        {contact.tags.length > 3 && (
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                                +{contact.tags.length - 3}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <div className="relative">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    className="border-slate-300"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Export Data
                                </Button>
                                {showExportMenu && (
                                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                                        <button
                                            onClick={() => handleExport('json')}
                                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
                                        >
                                            Export as JSON
                                        </button>
                                        <button
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
                                Are you sure you want to delete <strong>{contact.name}</strong>?
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
                                            tasks, projects, and activity history. This action <strong>cannot be
                                            undone</strong>. A deletion certificate will be generated for compliance.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {!gdprDelete && (
                                <p className="text-xs text-slate-500">
                                    Regular deletion will remove the contact but may retain some data for business
                                    records.
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
                                <>
                                    {gdprDelete ? 'Permanently Delete (GDPR)' : 'Delete'}
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
