'use client'

import { useContactStore } from '@/stores/contact-store'
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
import { AddContactDialog } from '@/components/contacts/add-contact-dialog'
import { ImportContactsDialog } from '@/components/contacts/import-contacts-dialog'
import { ExportContactsDialog } from '@/components/contacts/export-contacts-dialog'
import { KanbanBoard } from '@/components/contacts/kanban-board'
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
import { Checkbox } from "@/components/ui/checkbox"
import { STATUS_LABELS, STATUS_COLORS, ContactStatus } from '@/types/contact'
import { useState, useEffect } from 'react'
import { Search, Filter, Trash2, Loader2, LayoutGrid, List, ArrowLeft, ArrowRight, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { QuickActionsMenu } from '@/components/contacts/quick-actions-menu'
import { ColumnSettings } from '@/components/contacts/column-settings'
import { MergeContactsDialog } from '@/components/contacts/merge-contacts-dialog'
import { AdvancedFilters } from '@/components/contacts/advanced-filters'

export default function ContactsPage() {
    const {
        contacts,
        deleteContact,
        updateStatus,
        fetchContacts,
        isLoading,
        error,
        currentPage,
        pageSize,
        totalCount,
        filters,
        sortConfig,
        visibleColumns,
        selectedContactIds,
        setPage,
        setFilters,
        setSortConfig,
        toggleSelection,
        clearSelection,
        selectPage,
        bulkArchiveContacts,
        toggleColumn,
        setVisibleColumns
    } = useContactStore()

    const currentPageIds = contacts.map(c => c.id)
    const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedContactIds.includes(id))

    const [view, setView] = useState<'list' | 'kanban'>('list')
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isBulkArchiveDialogOpen, setIsBulkArchiveDialogOpen] = useState(false)
    const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false)
    const [contactToDeleteId, setContactToDeleteId] = useState<string | null>(null)
    const [localSearch, setLocalSearch] = useState(filters.search)

    // Sync local search with store
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== filters.search) {
                setFilters({ search: localSearch })
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [localSearch, setFilters, filters.search])

    // Fetch contacts on mount and load column preferences
    useEffect(() => {
        fetchContacts()

        // Load column preferences
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('orbit_contact_columns')
            if (saved) {
                try {
                    const columns = JSON.parse(saved)
                    if (Array.isArray(columns) && columns.length > 0) {
                        setVisibleColumns(columns)
                    }
                } catch (e) {
                    console.error('Error loading columns:', e)
                }
            }
        }
    }, [fetchContacts, setVisibleColumns])

    const handleBulkArchive = async () => {
        try {
            await bulkArchiveContacts(selectedContactIds)
            setIsBulkArchiveDialogOpen(false)
        } catch (error) {
            // Error is handled by store
        }
    }

    const totalPages = Math.ceil(totalCount / pageSize)

    const handleSort = (column: string) => {
        if (sortConfig.column === column) {
            setSortConfig({ column, ascending: !sortConfig.ascending })
        } else {
            setSortConfig({ column, ascending: true })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#3D4A67]">Contacts</h1>
                    <p className="text-slate-600">Manage your customer relationships</p>
                </div>
                <div className="flex gap-2">
                    <ExportContactsDialog totalContacts={totalCount} />
                    <ImportContactsDialog onImportComplete={() => fetchContacts()} />
                    <AddContactDialog />
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex gap-2 flex-1">
                    <div className="relative max-w-md flex-1 sm:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search contacts..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="pl-10 pr-10 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                        />
                        {localSearch && (
                            <button
                                onClick={() => setLocalSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <AdvancedFilters />
                    <ColumnSettings />
                </div>

                <div className="bg-slate-200 p-1 rounded-lg flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('list')}
                        className={`h-8 px-2 ${view === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <List className="h-4 w-4 mr-1.5" />
                        List
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('kanban')}
                        className={`h-8 px-2 ${view === 'kanban' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <LayoutGrid className="h-4 w-4 mr-1.5" />
                        Board
                    </Button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedContactIds.length > 0 && (
                <div className="bg-[#3D4A67] text-white px-4 py-3 rounded-lg flex items-center justify-between shadow-lg sticky top-4 z-40 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{selectedContactIds.length} selected</span>
                        <div className="h-4 w-px bg-slate-500" />
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/10 h-8"
                                onClick={() => setIsBulkArchiveDialogOpen(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Archive Selected
                            </Button>
                            {selectedContactIds.length === 2 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/10 h-8"
                                    onClick={() => setIsMergeDialogOpen(true)}
                                >
                                    <List className="h-4 w-4 mr-2" />
                                    Merge Contacts
                                </Button>
                            )}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSelection}
                        className="text-white hover:bg-white/10 h-8"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Clear Selection
                    </Button>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#3D4A67]" />
                    <span className="ml-2 text-slate-500">Loading contacts...</span>
                </div>
            ) : error ? (
                <div className="text-center py-12">
                    <p className="text-red-500 mb-2">Error loading contacts</p>
                    <p className="text-sm text-slate-500">{error}</p>
                    <Button variant="outline" onClick={fetchContacts} className="mt-4">
                        Retry
                    </Button>
                </div>
            ) : contacts.length === 0 ? (
                <Card className="border-slate-200 bg-white shadow-sm">
                    <CardContent className="pt-6">
                        <p className="text-slate-500 text-center py-12">
                            {filters.search || filters.status !== 'all' || filters.tags.length > 0
                                ? "No contacts match your filters."
                                : "No contacts yet. Add your first contact to get started."
                            }
                        </p>
                    </CardContent>
                </Card>
            ) : view === 'list' ? (
                <Card className="border-slate-200 bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-[#3D4A67]">All Contacts</CardTitle>
                            <CardDescription className="text-slate-600">
                                {totalCount} contact{totalCount !== 1 ? 's' : ''} total
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50 border-slate-200">
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={isAllPageSelected}
                                            onCheckedChange={() => selectPage(currentPageIds)}
                                            aria-label="Select all"
                                        />
                                    </TableHead>
                                    {visibleColumns.includes('name') && (
                                        <TableHead
                                            className="cursor-pointer hover:text-[#3D4A67] transition-colors"
                                            onClick={() => handleSort('first_name')}
                                        >
                                            Name {sortConfig.column === 'first_name' && (sortConfig.ascending ? '↑' : '↓')}
                                        </TableHead>
                                    )}
                                    {visibleColumns.includes('email') && (
                                        <TableHead
                                            className="cursor-pointer hover:text-[#3D4A67] transition-colors"
                                            onClick={() => handleSort('email')}
                                        >
                                            Email {sortConfig.column === 'email' && (sortConfig.ascending ? '↑' : '↓')}
                                        </TableHead>
                                    )}
                                    {visibleColumns.includes('phone') && (
                                        <TableHead
                                            className="cursor-pointer hover:text-[#3D4A67] transition-colors"
                                            onClick={() => handleSort('phone')}
                                        >
                                            Phone {sortConfig.column === 'phone' && (sortConfig.ascending ? '↑' : '↓')}
                                        </TableHead>
                                    )}
                                    {visibleColumns.includes('company') && (
                                        <TableHead
                                            className="cursor-pointer hover:text-[#3D4A67] transition-colors"
                                            onClick={() => handleSort('company_name')}
                                        >
                                            Company {sortConfig.column === 'company_name' && (sortConfig.ascending ? '↑' : '↓')}
                                        </TableHead>
                                    )}
                                    {visibleColumns.includes('status') && (
                                        <TableHead
                                            className="cursor-pointer hover:text-[#3D4A67] transition-colors"
                                            onClick={() => handleSort('status')}
                                        >
                                            Status {sortConfig.column === 'status' && (sortConfig.ascending ? '↑' : '↓')}
                                        </TableHead>
                                    )}
                                    {visibleColumns.includes('created_at') && (
                                        <TableHead
                                            className="cursor-pointer hover:text-[#3D4A67] transition-colors"
                                            onClick={() => handleSort('created_at')}
                                        >
                                            Added {sortConfig.column === 'created_at' && (sortConfig.ascending ? '↑' : '↓')}
                                        </TableHead>
                                    )}
                                    {visibleColumns.includes('actions') && (
                                        <TableHead className="text-right">Actions</TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contacts.map((contact) => (
                                    <TableRow key={contact.id} className={selectedContactIds.includes(contact.id) ? 'bg-slate-50' : ''}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedContactIds.includes(contact.id)}
                                                onCheckedChange={() => toggleSelection(contact.id)}
                                                aria-label={`Select ${contact.firstName}`}
                                            />
                                        </TableCell>
                                        {visibleColumns.includes('name') && (
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={`/contacts/${contact.id}`}
                                                    className="text-[#3D4A67] hover:underline"
                                                >
                                                    {contact.isCompany ? contact.companyName : `${contact.firstName} ${contact.lastName}`}
                                                </Link>
                                            </TableCell>
                                        )}
                                        {visibleColumns.includes('email') && (
                                            <TableCell>{contact.email}</TableCell>
                                        )}
                                        {visibleColumns.includes('phone') && (
                                            <TableCell>{contact.phone || '-'}</TableCell>
                                        )}
                                        {visibleColumns.includes('company') && (
                                            <TableCell>{contact.companyName || '-'}</TableCell>
                                        )}
                                        {visibleColumns.includes('status') && (
                                            <TableCell>
                                                <Select
                                                    value={contact.status}
                                                    onValueChange={(v) => updateStatus(contact.id, v as ContactStatus)}
                                                >
                                                    <SelectTrigger
                                                        className="w-32 h-8"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <SelectValue placeholder={STATUS_LABELS[contact.status]}>
                                                            <Badge className={cn("font-normal pointer-events-none", STATUS_COLORS[contact.status])}>
                                                                {STATUS_LABELS[contact.status]}
                                                            </Badge>
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                                            <SelectItem key={value} value={value}>
                                                                {label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        )}
                                        {visibleColumns.includes('created_at') && (
                                            <TableCell>{new Date(contact.createdAt).toLocaleDateString()}</TableCell>
                                        )}
                                        {visibleColumns.includes('actions') && (
                                            <TableCell className="text-right">
                                                <QuickActionsMenu
                                                    contact={contact}
                                                    onDelete={() => {
                                                        setContactToDeleteId(contact.id)
                                                        setIsDeleteDialogOpen(true)
                                                    }}
                                                />
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination Controls */}
                        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                            <div className="flex items-center gap-4">
                                <p className="text-sm text-slate-500">
                                    Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="font-medium">{totalCount}</span> results
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-500">Rows:</span>
                                    <Select
                                        value={pageSize.toString()}
                                        onValueChange={(v) => useContactStore.getState().setPageSize(parseInt(v))}
                                    >
                                        <SelectTrigger className="w-20 h-8 border-slate-300">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[10, 20, 50, 100].map(size => (
                                                <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="border-slate-300"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        // Simple pagination window logic
                                        let pageNum = i + 1
                                        if (totalPages > 5 && currentPage > 3) {
                                            pageNum = currentPage - 2 + i
                                            if (pageNum + (5 - i - 1) > totalPages) {
                                                pageNum = totalPages - 4 + i
                                            }
                                        }

                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setPage(pageNum)}
                                                className={currentPage === pageNum ? "bg-[#3D4A67]" : "border-slate-300"}
                                            >
                                                {pageNum}
                                            </Button>
                                        )
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="border-slate-300"
                                >
                                    Next
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <KanbanBoard
                    contacts={contacts}
                    onDeleteContact={(id) => {
                        setContactToDeleteId(id)
                        setIsDeleteDialogOpen(true)
                    }}
                />
            )}

            <MergeContactsDialog
                open={isMergeDialogOpen}
                onOpenChange={setIsMergeDialogOpen}
                contacts={contacts.filter(c => selectedContactIds.includes(c.id))}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will archive the contact. You can still see archived contacts in the filters.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setContactToDeleteId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-[#D1855C] hover:bg-[#B1653C] text-white"
                            onClick={() => {
                                if (contactToDeleteId) {
                                    deleteContact(contactToDeleteId)
                                    setContactToDeleteId(null)
                                }
                            }}
                        >
                            Archive
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* Bulk Archive Confirmation */}
            <AlertDialog open={isBulkArchiveDialogOpen} onOpenChange={setIsBulkArchiveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive Multiple Contacts?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to archive {selectedContactIds.length} contacts?
                            They will be hidden from the main list but can be restored later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkArchive} className="bg-red-600 focus:ring-red-600">
                            Archive All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
