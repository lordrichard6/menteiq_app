'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
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
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { type Document } from '@/lib/types/schema'
import {
    FileText,
    Eye,
    EyeOff,
    Upload,
    Download,
    Trash2,
    Sparkles,
    Search as SearchIcon,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { UploadDialog } from '@/components/documents/upload-dialog'
import { toast } from 'sonner'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const STATUS_CONFIG = {
    pending:    { label: 'Pending',    className: 'bg-slate-100 text-slate-700'  },
    processing: { label: 'Processing', className: 'bg-blue-100 text-blue-700'   },
    complete:   { label: 'Ready',      className: 'bg-green-100 text-green-700' },
    error:      { label: 'Error',      className: 'bg-red-100 text-red-700'     },
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null) {
    if (!bytes) return '--'
    if (bytes < 1024)             return `${bytes} B`
    if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(1)} KB`
    return                               `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString: string) {
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateString))
}

/** Relative date: "just now", "3h ago", "yesterday", falling back to absolute */
function formatRelativeDate(dateString: string): string {
    const diffMs    = Date.now() - new Date(dateString).getTime()
    const diffMins  = Math.floor(diffMs / 60_000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays  = Math.floor(diffHours / 24)
    if (diffMins  <  1)  return 'just now'
    if (diffMins  < 60)  return `${diffMins}m ago`
    if (diffHours < 24)  return `${diffHours}h ago`
    if (diffDays  === 1) return 'yesterday'
    if (diffDays  < 30)  return `${diffDays}d ago`
    return formatDate(dateString)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentManager() {
    const supabase = createClient()

    // ── Core state ────────────────────────────────────────────────────────────
    const [docs,              setDocs]              = React.useState<Document[]>([])
    const [uploadDialogOpen,  setUploadDialogOpen]  = React.useState(false)
    const [processingDocs,    setProcessingDocs]    = React.useState<Set<string>>(new Set())

    // ── Search ────────────────────────────────────────────────────────────────
    const [searchQuery,   setSearchQuery]   = React.useState('')
    const [searchResults, setSearchResults] = React.useState<{ documentName: string; similarity: number; content: string }[]>([])
    const [isSearching,   setIsSearching]   = React.useState(false)
    const [searchLimit,   setSearchLimit]   = React.useState(10)

    // ── Bulk selection ────────────────────────────────────────────────────────
    const [selectedIds,             setSelectedIds]             = React.useState<Set<string>>(new Set())
    const [showBulkDeleteConfirm,   setShowBulkDeleteConfirm]   = React.useState(false)
    const [isBulkDeleting,          setIsBulkDeleting]          = React.useState(false)

    // ── Pagination ────────────────────────────────────────────────────────────
    const [currentPage, setCurrentPage] = React.useState(1)

    // ── Data fetch ────────────────────────────────────────────────────────────

    const fetchDocs = React.useCallback(async () => {
        const { data } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (data) setDocs(data as any)
    }, [supabase])

    React.useEffect(() => { fetchDocs() }, [fetchDocs])

    // ── Pagination derived state ──────────────────────────────────────────────

    const totalPages    = Math.max(1, Math.ceil(docs.length / PAGE_SIZE))
    const paginatedDocs = docs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    // Reset to page 1 when doc count changes
    React.useEffect(() => { setCurrentPage(1) }, [docs.length])

    // ── Selection helpers ─────────────────────────────────────────────────────

    const allOnPageSelected  = paginatedDocs.length > 0 && paginatedDocs.every(d => selectedIds.has(d.id))
    const someOnPageSelected = paginatedDocs.some(d => selectedIds.has(d.id))

    const toggleSelectAll = () => {
        if (allOnPageSelected) {
            setSelectedIds(prev => { const n = new Set(prev); paginatedDocs.forEach(d => n.delete(d.id)); return n })
        } else {
            setSelectedIds(prev => { const n = new Set(prev); paginatedDocs.forEach(d => n.add(d.id));    return n })
        }
    }

    const toggleSelect = (id: string) =>
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

    // ── Visibility toggle — optimistic update (fixes #6) ─────────────────────

    const toggleVisibility = async (doc: Document) => {
        const next = doc.visibility === 'internal' ? 'shared' : 'internal'
        setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, visibility: next } : d))

        const { error } = await supabase
            .from('documents')
            .update({ visibility: next })
            .eq('id', doc.id)

        if (error) {
            setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, visibility: doc.visibility } : d))
            toast.error('Failed to update visibility')
        } else {
            toast.success(`Visibility set to ${next}`)
        }
    }

    // ── Delete with 5-second undo (fixes #2 error handling + #3 no confirm() + #14 undo) ──

    const handleDelete = (doc: Document) => {
        // Optimistic remove
        setDocs(prev => prev.filter(d => d.id !== doc.id))
        setSelectedIds(prev => { const n = new Set(prev); n.delete(doc.id); return n })

        let undone = false

        const timer = setTimeout(async () => {
            if (undone) return
            // Delete from storage
            const { error: storageErr } = await supabase.storage
                .from('documents')
                .remove([doc.file_path])
            if (storageErr) console.error('Storage delete error:', storageErr)

            // Delete DB record (even if storage had an error — the file is gone or irretrievable)
            const { error: dbErr } = await supabase
                .from('documents')
                .delete()
                .eq('id', doc.id)

            if (dbErr) {
                toast.error('Failed to delete document record')
                // Restore to UI
                setDocs(prev =>
                    [...prev, doc].sort((a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                )
            }
        }, 5000)

        toast(`"${doc.name}" deleted`, {
            duration: 5000,
            action: {
                label: 'Undo',
                onClick: () => {
                    clearTimeout(timer)
                    undone = true
                    setDocs(prev =>
                        [...prev, doc].sort((a, b) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        )
                    )
                },
            },
        })
    }

    // ── Bulk delete (fixes #4) ─────────────────────────────────────────────────

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true)
        const ids         = Array.from(selectedIds)
        const toDelete    = docs.filter(d => ids.includes(d.id))
        const filePaths   = toDelete.map(d => d.file_path)

        // Optimistic remove
        setDocs(prev => prev.filter(d => !ids.includes(d.id)))
        setSelectedIds(new Set())
        setShowBulkDeleteConfirm(false)

        try {
            await supabase.storage.from('documents').remove(filePaths)
            const { error } = await supabase.from('documents').delete().in('id', ids)
            if (error) throw error
            toast.success(`${ids.length} document${ids.length !== 1 ? 's' : ''} deleted`)
        } catch {
            toast.error('Failed to delete some documents')
            setDocs(prev =>
                [...prev, ...toDelete].sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
            )
        } finally {
            setIsBulkDeleting(false)
        }
    }

    // ── Download (fixes #3 alert → toast) ─────────────────────────────────────

    const handleDownload = async (doc: Document) => {
        const { data, error } = await supabase.storage
            .from('documents')
            .download(doc.file_path)

        if (error) { toast.error('Failed to download file'); return }

        const url = window.URL.createObjectURL(data)
        const a   = Object.assign(document.createElement('a'), { href: url, download: doc.name })
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }

    // ── Process — optimistic status + toast (fixes #3 alert + #7 feedback) ─────

    const handleProcess = React.useCallback(async (documentId: string, silent = false) => {
        setProcessingDocs(prev => new Set(prev).add(documentId))
        setDocs(prev => prev.map(d =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            d.id === documentId ? { ...d, embedding_status: 'processing' as any } : d
        ))

        try {
            const res = await fetch('/api/documents/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Processing failed')
            }

            const result = await res.json()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setDocs(prev => prev.map(d => d.id === documentId ? { ...d, embedding_status: 'complete' as any } : d))

            if (!silent) {
                toast.success(`Processed — ${result.chunksCreated} chunks, ${result.tokensUsed} tokens`)
            }
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setDocs(prev => prev.map(d => d.id === documentId ? { ...d, embedding_status: 'error' as any } : d))
            if (!silent) toast.error(err instanceof Error ? err.message : 'Failed to process document')
        } finally {
            setProcessingDocs(prev => { const n = new Set(prev); n.delete(documentId); return n })
        }
    }, [])

    // ── Bulk process (fixes #4) ────────────────────────────────────────────────

    const handleBulkProcess = async () => {
        const ids = Array.from(selectedIds).filter(id => {
            const doc = docs.find(d => d.id === id)
            return doc && (doc.embedding_status === 'pending' || doc.embedding_status === 'error')
        })
        if (ids.length === 0) { toast.info('No pending/error documents selected'); return }

        toast.info(`Processing ${ids.length} document${ids.length !== 1 ? 's' : ''}…`)
        await Promise.all(ids.map(id => handleProcess(id, true)))
        toast.success(`Finished processing ${ids.length} document${ids.length !== 1 ? 's' : ''}`)
    }

    // ── Search ────────────────────────────────────────────────────────────────

    const runSearch = async (limit = searchLimit) => {
        if (!searchQuery.trim()) { setSearchResults([]); return }
        setIsSearching(true)
        try {
            const res = await fetch(
                `/api/documents/search?q=${encodeURIComponent(searchQuery)}&method=hybrid&limit=${limit}`
            )
            if (!res.ok) throw new Error('Search failed')
            const data = await res.json()
            setSearchResults(data.results || [])
        } catch {
            toast.error('Search failed — please try again')
        } finally {
            setIsSearching(false)
        }
    }

    const handleLoadMore = () => {
        const next = searchLimit + 10
        setSearchLimit(next)
        runSearch(next)
    }

    // Better empty search message (fixes #20)
    const hasProcessedDocs = docs.some(d => d.embedding_status === 'complete')
    const emptySearchMsg   = hasProcessedDocs
        ? 'No results found for this query — try different keywords.'
        : 'No processed documents yet. Click ✨ next to a document to process it first.'

    // ── JSX ───────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Vault</h2>
                    <p className="text-slate-500 mt-1">Upload and manage documents for AI knowledge base</p>
                </div>
                <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" aria-hidden /> Upload Document
                </Button>
            </div>

            {/* Semantic Search */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-1">Semantic Search</h3>
                        <p className="text-sm text-slate-500">Search your documents using natural language</p>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Ask a question about your documents…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                            aria-label="Search documents"
                        />
                        <Button
                            onClick={() => runSearch()}
                            disabled={isSearching || !searchQuery.trim()}
                            aria-label="Run search"
                        >
                            {isSearching
                                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                : <SearchIcon className="mr-2 h-4 w-4" aria-hidden />
                            }
                            {isSearching ? 'Searching…' : 'Search'}
                        </Button>
                    </div>

                    {/* Search results */}
                    {searchResults.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-600">
                                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                            </p>
                            {searchResults.map((result, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded border border-slate-200">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <p className="text-sm font-medium">{result.documentName}</p>
                                        <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                                            {(result.similarity * 100).toFixed(0)}% match
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-700 line-clamp-3">{result.content}</p>
                                </div>
                            ))}
                            {/* Load more (fixes #15) */}
                            {searchResults.length >= searchLimit && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={handleLoadMore}
                                    disabled={isSearching}
                                >
                                    {isSearching && <Loader2 className="h-3 w-3 mr-2 animate-spin" aria-hidden />}
                                    Load more results
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Better empty search message (fixes #20) */}
                    {searchQuery && searchResults.length === 0 && !isSearching && (
                        <p className="text-sm text-slate-500">{emptySearchMsg}</p>
                    )}
                </CardContent>
            </Card>

            {/* Bulk action toolbar (fixes #4) */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#3D4A67] text-white rounded-lg">
                    <span className="text-sm font-medium">{selectedIds.size} selected</span>
                    <div className="flex gap-2 ml-auto flex-wrap">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white border-0"
                            onClick={handleBulkProcess}
                            disabled={isBulkDeleting}
                            aria-label="Process selected documents with AI"
                        >
                            <Sparkles className="h-3.5 w-3.5 mr-1" aria-hidden /> Process Selected
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs bg-red-500/80 hover:bg-red-500 text-white border-0"
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            disabled={isBulkDeleting}
                            aria-label={`Delete ${selectedIds.size} selected documents`}
                        >
                            {isBulkDeleting
                                ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" aria-hidden />
                                : <Trash2 className="h-3.5 w-3.5 mr-1" aria-hidden />
                            }
                            Delete Selected
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/10"
                            onClick={() => setSelectedIds(new Set())}
                            aria-label="Clear selection"
                        >
                            Clear
                        </Button>
                    </div>
                </div>
            )}

            {/* Documents table (fixes #8 pagination, #9 ARIA, #10 keyboard toggle, #11 responsive) */}
            <Card>
                <CardContent className="p-0">
                    {/* overflow-x-auto for mobile (fixes #11) */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10 pl-4">
                                        {/* Indeterminate-capable select-all (fixes #9) */}
                                        <Checkbox
                                            checked={
                                                allOnPageSelected
                                                    ? true
                                                    : someOnPageSelected
                                                    ? 'indeterminate'
                                                    : false
                                            }
                                            onCheckedChange={toggleSelectAll}
                                            aria-label="Select all documents on this page"
                                        />
                                    </TableHead>
                                    <TableHead className="w-8" aria-hidden />
                                    <TableHead>Name</TableHead>
                                    <TableHead>Visibility</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Uploaded</TableHead>
                                    <TableHead className="text-right pr-4">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedDocs.map((doc) => (
                                    <TableRow
                                        key={doc.id}
                                        className={selectedIds.has(doc.id) ? 'bg-blue-50/40' : undefined}
                                    >
                                        <TableCell className="pl-4">
                                            <Checkbox
                                                checked={selectedIds.has(doc.id)}
                                                onCheckedChange={() => toggleSelect(doc.id)}
                                                aria-label={`Select ${doc.name}`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FileText className="h-4 w-4 text-slate-400" aria-hidden />
                                        </TableCell>

                                        {/* Name + content_summary preview (fixes #5) */}
                                        <TableCell className="font-medium">
                                            <div className="max-w-xs">
                                                <p className="truncate" title={doc.name}>{doc.name}</p>
                                                {doc.content_summary && (
                                                    <p className="text-xs text-slate-400 truncate mt-0.5">
                                                        {doc.content_summary}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Visibility as <button> for keyboard access (fixes #10) */}
                                        <TableCell>
                                            <button
                                                className="flex items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                onClick={() => toggleVisibility(doc)}
                                                aria-label={`Visibility: ${doc.visibility}. Click to toggle.`}
                                                title="Click to toggle visibility"
                                            >
                                                {doc.visibility === 'internal' ? (
                                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer">
                                                        <EyeOff className="w-3 h-3 mr-1" aria-hidden /> Internal
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer">
                                                        <Eye className="w-3 h-3 mr-1" aria-hidden /> Shared
                                                    </Badge>
                                                )}
                                            </button>
                                        </TableCell>

                                        {/* Status badge with spinner when processing (fixes #7) */}
                                        <TableCell>
                                            {(() => {
                                                const cfg = STATUS_CONFIG[doc.embedding_status as keyof typeof STATUS_CONFIG]
                                                if (!cfg) return null
                                                return (
                                                    <Badge variant="secondary" className={cfg.className}>
                                                        {processingDocs.has(doc.id) && (
                                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" aria-hidden />
                                                        )}
                                                        {cfg.label}
                                                    </Badge>
                                                )
                                            })()}
                                        </TableCell>

                                        <TableCell className="text-slate-600 text-sm">
                                            {formatFileSize(doc.size_bytes)}
                                        </TableCell>

                                        {/* Relative + absolute date (fixes #19) */}
                                        <TableCell className="text-sm">
                                            <p className="text-slate-700">{formatRelativeDate(doc.created_at)}</p>
                                            <p className="text-xs text-slate-400">{formatDate(doc.created_at)}</p>
                                        </TableCell>

                                        {/* Actions with aria-labels (fixes #9) */}
                                        <TableCell className="text-right pr-4">
                                            <div className="flex items-center justify-end gap-1">
                                                {(doc.embedding_status === 'pending' || doc.embedding_status === 'error') && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8"
                                                        onClick={() => handleProcess(doc.id)}
                                                        disabled={processingDocs.has(doc.id)}
                                                        aria-label={doc.embedding_status === 'error' ? `Retry processing ${doc.name}` : `Process ${doc.name} with AI`}
                                                        title={doc.embedding_status === 'error' ? 'Retry AI processing' : 'Process with AI (extract text & embeddings)'}
                                                    >
                                                        {processingDocs.has(doc.id)
                                                            ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden />
                                                            : <Sparkles className={`h-4 w-4 ${doc.embedding_status === 'error' ? 'text-amber-500' : 'text-purple-500'}`} aria-hidden />
                                                        }
                                                    </Button>
                                                )}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={() => handleDownload(doc)}
                                                    aria-label={`Download ${doc.name}`}
                                                    title="Download file"
                                                >
                                                    <Download className="h-4 w-4" aria-hidden />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => handleDelete(doc)}
                                                    aria-label={`Delete ${doc.name}`}
                                                    title="Delete document"
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-400" aria-hidden />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {docs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-16">
                                            <div className="flex flex-col items-center justify-center text-slate-500">
                                                <FileText className="h-12 w-12 mb-3 opacity-30" aria-hidden />
                                                <p className="font-medium">No documents in the Vault</p>
                                                <p className="text-sm mt-1">Upload documents to build your AI knowledge base</p>
                                                <Button
                                                    onClick={() => setUploadDialogOpen(true)}
                                                    className="mt-4"
                                                    variant="outline"
                                                >
                                                    <Upload className="h-4 w-4 mr-2" aria-hidden />
                                                    Upload Your First Document
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination (fixes #8) */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                            <p className="text-sm text-slate-500">
                                {docs.length} document{docs.length !== 1 ? 's' : ''} · Page {currentPage} of {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft className="h-4 w-4" aria-hidden />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    aria-label="Next page"
                                >
                                    <ChevronRight className="h-4 w-4" aria-hidden />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bulk delete confirmation dialog (fixes #3 — no more confirm()) */}
            <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {selectedIds.size} document{selectedIds.size !== 1 ? 's' : ''}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete {selectedIds.size} document{selectedIds.size !== 1 ? 's' : ''} from
                            storage and remove all AI embeddings. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isBulkDeleting
                                ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden />
                                : <Trash2 className="h-4 w-4 mr-2" aria-hidden />
                            }
                            Delete {selectedIds.size} document{selectedIds.size !== 1 ? 's' : ''}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Upload dialog */}
            <UploadDialog
                open={uploadDialogOpen}
                onOpenChange={setUploadDialogOpen}
                onUploadComplete={fetchDocs}
            />
        </div>
    )
}
