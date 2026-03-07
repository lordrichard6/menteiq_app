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
import {
    Search,
    Trash2,
    Loader2,
    LayoutGrid,
    List,
    ArrowLeft,
    ArrowRight,
    X,
    ChevronUp,
    ChevronDown,
    ArchiveRestore,
    RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { QuickActionsMenu } from '@/components/contacts/quick-actions-menu'
import { ColumnSettings } from '@/components/contacts/column-settings'
import { MergeContactsDialog } from '@/components/contacts/merge-contacts-dialog'
import { AdvancedFilters } from '@/components/contacts/advanced-filters'

const COLUMN_STORAGE_KEY = 'menteiq_contact_columns'

export default function ContactsPage() {
    const {
        contacts,
        deleteContact,
        restoreContact,
        updateStatus,
        bulkUpdateStatus,
        fetchContacts,
        fetchAllContactsForKanban,
        fetchAllTags,
        fetchStatusCounts,
        isLoading,
        error,
        currentPage,
        pageSize,
        totalCount,
        filters,
        sortConfig,
        statusCounts,
        visibleColumns,
        selectedContactIds,
        setPage,
        setFilters,
        setSortConfig,
        toggleSelection,
        clearSelection,
        selectPage,
        bulkArchiveContacts,
        setVisibleColumns,
    } = useContactStore()

    const currentPageIds = contacts.map(c => c.id)
    const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedContactIds.includes(id))

    const [view, setView] = useState<'list' | 'kanban'>('list')
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isBulkArchiveDialogOpen, setIsBulkArchiveDialogOpen] = useState(false)
    const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false)
    const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false)
    const [bulkStatusTarget, setBulkStatusTarget] = useState<ContactStatus>('client')
    const [contactToDeleteId, setContactToDeleteId] = useState<string | null>(null)
    const [localSearch, setLocalSearch] = useState(filters.search)
    const [isSearching, setIsSearching] = useState(false)

    // Sync local search with store (debounced 300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== filters.search) {
                setIsSearching(false)
                setFilters({ search: localSearch })
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [localSearch, setFilters, filters.search])

    // Initial data fetch + load column preferences
    useEffect(() => {
        fetchContacts()
        fetchAllTags()
        fetchStatusCounts()

        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(COLUMN_STORAGE_KEY)
            if (saved) {
                try {
                    const columns = JSON.parse(saved) as string[]
                    if (Array.isArray(columns) && columns.length > 0) {
                        setVisibleColumns(columns)
                    }
                } catch (e) {
                    console.error('Error loading columns:', e)
                }
            }
        }
    }, [fetchContacts, fetchAllTags, fetchStatusCounts, setVisibleColumns])

    const handleSwitchToKanban = () => {
        setView('kanban')
        fetchAllContactsForKanban()
    }

    const handleBulkArchive = async () => {
        try {
            await bulkArchiveContacts(selectedContactIds)
            setIsBulkArchiveDialogOpen(false)
        } catch {
            // error handled by store toast
        }
    }

    const handleBulkStatusChange = async () => {
        try {
            await bulkUpdateStatus(selectedContactIds, bulkStatusTarget)
            setIsBulkStatusDialogOpen(false)
        } catch {
            // error handled by store
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

    const sortIcon = (column: string) => {
        if (sortConfig.column !== column) return null
        return sortConfig.ascending
            ? <ChevronUp className="inline h-3 w-3 ml-1" />
            : <ChevronDown className="inline h-3 w-3 ml-1" />
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#3D4A67]">Contacts</h1>
                    <p className="text-slate-600 text-sm sm:text-base">Manage your customer relationships</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <ExportContactsDialog totalContacts={totalCount} />
                    <ImportContactsDialog onImportComplete={() => fetchContacts()} />
                    <AddContactDialog />
                </div>
            </div>

            {/* Status Count Bar — clickable quick filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.entries(STATUS_LABELS) as [ContactStatus, string][]).map(([status, label]) => (
                    <button
                        key={status}
                        onClick={() => setFilters({ status: filters.status === status ? 'all' : status })}
                        className={cn(
                            'flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left',
                            filters.status === status
                                ? 'bg-[#3D4A67] text-white border-[#3D4A67] shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        )}
                    >
                        <span>{label}</span>
                        <Badge
                            className={cn(
                                'text-xs h-5 px-1.5 min-w-[1.5rem] flex items-center justify-center border-0',
                                filters.status === status
                                    ? 'bg-white/20 text-white'
                                    : STATUS_COLORS[status]
                            )}
                        >
                            {statusCounts[status]}
                        </Badge>
                    </button>
                ))}
            </div>

            {/* Filters & View Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {/* Search with loading indicator */}
                    <div className="relative flex-1 sm:flex-none sm:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search contacts..."
                            value={localSearch}
                            onChange={(e) => {
                                setLocalSearch(e.target.value)
                                setIsSearching(true)
                            }}
                            className="pl-10 pr-10 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 h-9"
                        />
                        {isSearching && localSearch ? (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                        ) : localSearch ? (
                            <button
                                onClick={() => setLocalSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        ) : null}
                    </div>

                    <AdvancedFilters />
                    <ColumnSettings />

                    {/* Show Archived Toggle */}
                    <Button
                        variant={filters.showArchived ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                            'h-9',
                            filters.showArchived
                                ? 'bg-amber-600 hover:bg-amber-700 text-white border-0'
                                : 'border-slate-300'
                        )}
                        onClick={() => setFilters({ showArchived: !filters.showArchived })}
                    >
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Archived
                    </Button>
                </div>

                {/* View Toggle */}
                <div className="bg-slate-200 p-1 rounded-lg flex items-center gap-1 shrink-0">
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
                        onClick={handleSwitchToKanban}
                        className={`h-8 px-2 ${view === 'kanban' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <LayoutGrid className="h-4 w-4 mr-1.5" />
                        Board
                    </Button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedContactIds.length > 0 && (
                <div className="bg-[#3D4A67] text-white px-4 py-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg sticky top-4 z-40 animate-in slide-in-from-top-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium">{selectedContactIds.length} selected</span>
                        <div className="h-4 w-px bg-white/30 hidden sm:block" />
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/10 h-8"
                                onClick={() => setIsBulkArchiveDialogOpen(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Archive
                            </Button>
                            {filters.showArchived && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/10 h-8"
                                    onClick={async () => {
                                        await Promise.all(selectedContactIds.map(id => restoreContact(id)))
                                        clearSelection()
                                    }}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Restore
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/10 h-8"
                                onClick={() => setIsBulkStatusDialogOpen(true)}
                            >
                                Change Status
                            </Button>
                            {selectedContactIds.length === 2 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/10 h-8"
                                    onClick={() => setIsMergeDialogOpen(true)}
                                >
                                    <List className="h-4 w-4 mr-2" />
                                    Merge
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
                        Clear
                    </Button>
                </div>
            )}

            {/* Content Area */}
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
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                <Search className="h-8 w-8 text-slate-300" />
                            </div>
                            <p className="text-slate-600 font-medium mb-1">
                                {filters.search || filters.status !== 'all' || (filters.tags && filters.tags.length > 0) || filters.showArchived
                                    ? 'No contacts match your filters'
                                    : 'No contacts yet'}
                            </p>
                            <p className="text-sm text-slate-400">
                                {filters.search || filters.status !== 'all' || (filters.tags && filters.tags.length > 0) || filters.showArchived
                                    ? 'Try adjusting your search or filters'
                                    : 'Add your first contact to get started'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : view === 'list' ? (
                <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                            <CardTitle className="text-[#3D4A67]">
                                {filters.showArchived ? 'Archived Contacts' : 'All Contacts'}
                            </CardTitle>
                            <CardDescription className="text-slate-600">
                                {totalCount} contact{totalCount !== 1 ? 's' : ''} total
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 hover:bg-slate-50 border-slate-200">
                                        <TableHead className="w-12 pl-4 sm:pl-6">
                                            <Checkbox
                                                checked={isAllPageSelected}
                                                onCheckedChange={() => selectPage(currentPageIds)}
                                                aria-label="Select all"
                                            />
                                        </TableHead>
                                        {visibleColumns.includes('name') && (
                                            <TableHead
                                                className="cursor-pointer hover:text-[#3D4A67] transition-colors whitespace-nowrap"
                                                onClick={() => handleSort('first_name')}
                                            >
                                                Name {sortIcon('first_name')}
                                            </TableHead>
                                        )}
                                        {visibleColumns.includes('email') && (
                                            <TableHead
                                                className="cursor-pointer hover:text-[#3D4A67] transition-colors hidden sm:table-cell whitespace-nowrap"
                                                onClick={() => handleSort('email')}
                                            >
                                                Email {sortIcon('email')}
                                            </TableHead>
                                        )}
                                        {visibleColumns.includes('phone') && (
                                            <TableHead
                                                className="cursor-pointer hover:text-[#3D4A67] transition-colors hidden md:table-cell whitespace-nowrap"
                                                onClick={() => handleSort('phone')}
                                            >
                                                Phone {sortIcon('phone')}
                                            </TableHead>
                                        )}
                                        {visibleColumns.includes('company') && (
                                            <TableHead
                                                className="cursor-pointer hover:text-[#3D4A67] transition-colors hidden lg:table-cell whitespace-nowrap"
                                                onClick={() => handleSort('company_name')}
                                            >
                                                Company {sortIcon('company_name')}
                                            </TableHead>
                                        )}
                                        {visibleColumns.includes('status') && (
                                            <TableHead
                                                className="cursor-pointer hover:text-[#3D4A67] transition-colors whitespace-nowrap"
                                                onClick={() => handleSort('status')}
                                            >
                                                Status {sortIcon('status')}
                                            </TableHead>
                                        )}
                                        {visibleColumns.includes('created_at') && (
                                            <TableHead
                                                className="cursor-pointer hover:text-[#3D4A67] transition-colors hidden xl:table-cell whitespace-nowrap"
                                                onClick={() => handleSort('created_at')}
                                            >
                                                Added {sortIcon('created_at')}
                                            </TableHead>
                                        )}
                                        {visibleColumns.includes('actions') && (
                                            <TableHead className="text-right pr-4 sm:pr-6">Actions</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contacts.map((contact) => (
                                        <TableRow
                                            key={contact.id}
                                            className={selectedContactIds.includes(contact.id) ? 'bg-slate-50' : ''}
                                        >
                                            <TableCell className="pl-4 sm:pl-6">
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
                                                <TableCell className="hidden sm:table-cell text-slate-600 text-sm">
                                                    {contact.email}
                                                </TableCell>
                                            )}
                                            {visibleColumns.includes('phone') && (
                                                <TableCell className="hidden md:table-cell text-slate-600 text-sm">
                                                    {contact.phone || '-'}
                                                </TableCell>
                                            )}
                                            {visibleColumns.includes('company') && (
                                                <TableCell className="hidden lg:table-cell text-slate-600 text-sm">
                                                    {contact.companyName || '-'}
                                                </TableCell>
                                            )}
                                            {visibleColumns.includes('status') && (
                                                <TableCell>
                                                    <Select
                                                        value={contact.status}
                                                        onValueChange={(v) => updateStatus(contact.id, v as ContactStatus)}
                                                        disabled={!!filters.showArchived}
                                                    >
                                                        <SelectTrigger
                                                            className="w-32 h-8"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <SelectValue placeholder={STATUS_LABELS[contact.status]}>
                                                                <Badge className={cn('font-normal pointer-events-none', STATUS_COLORS[contact.status])}>
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
                                                <TableCell className="hidden xl:table-cell text-slate-500 text-sm">
                                                    {new Date(contact.createdAt).toLocaleDateString()}
                                                </TableCell>
                                            )}
                                            {visibleColumns.includes('actions') && (
                                                <TableCell className="text-right pr-4 sm:pr-6">
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
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-4 gap-4 border-t border-slate-100">
                            <div className="flex items-center gap-4">
                                <p className="text-sm text-slate-500">
                                    Showing{' '}
                                    <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>
                                    {' '}–{' '}
                                    <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span>
                                    {' '}of{' '}
                                    <span className="font-medium">{totalCount}</span>
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
                                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setPage(pageNum)}
                                                className={currentPage === pageNum ? 'bg-[#3D4A67]' : 'border-slate-300'}
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
                                    disabled={currentPage === totalPages || totalPages === 0}
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
                    onDeleteContact={(id) => {
                        setContactToDeleteId(id)
                        setIsDeleteDialogOpen(true)
                    }}
                />
            )}

            {/* Merge Dialog — key forces remount when pair changes, resetting state cleanly */}
            <MergeContactsDialog
                key={selectedContactIds.join('-')}
                open={isMergeDialogOpen}
                onOpenChange={setIsMergeDialogOpen}
                contacts={contacts.filter(c => selectedContactIds.includes(c.id))}
            />

            {/* Single Archive Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive contact?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will archive the contact. You can restore them later by enabling
                            &quot;Archived&quot; in the filters toolbar.
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
                        <AlertDialogTitle>Archive {selectedContactIds.length} contacts?</AlertDialogTitle>
                        <AlertDialogDescription>
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

            {/* Bulk Status Change Dialog */}
            <AlertDialog open={isBulkStatusDialogOpen} onOpenChange={setIsBulkStatusDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Change status for {selectedContactIds.length} contacts</AlertDialogTitle>
                        <AlertDialogDescription>
                            Select the new status to apply to all selected contacts.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="px-6 pb-4">
                        <Select value={bulkStatusTarget} onValueChange={(v) => setBulkStatusTarget(v as ContactStatus)}>
                            <SelectTrigger className="w-full border-slate-300">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkStatusChange}
                            className="bg-[#3D4A67] hover:bg-[#2D3A57]"
                        >
                            Apply Status
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
