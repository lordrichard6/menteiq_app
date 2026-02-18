'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { type Document } from '@/lib/types/schema';
import { FileText, Eye, EyeOff, Upload, Download, Trash2, Sparkles, Search as SearchIcon } from 'lucide-react';
import { UploadDialog } from '@/components/documents/upload-dialog';
import { Input } from '@/components/ui/input';

export function DocumentManager() {
    const [docs, setDocs] = React.useState<Document[]>([]);
    const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
    const [processingDocs, setProcessingDocs] = React.useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchResults, setSearchResults] = React.useState<any[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const supabase = createClient();

    const fetchDocs = React.useCallback(async () => {
        const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
        if (data) setDocs(data as any);
    }, [supabase]);

    React.useEffect(() => {
        fetchDocs();
    }, [fetchDocs]);

    const toggleVisibility = async (doc: Document) => {
        const newVisibility = doc.visibility === 'internal' ? 'shared' : 'internal';

        const { error } = await supabase
            .from('documents')
            .update({ visibility: newVisibility })
            .eq('id', doc.id);

        if (!error) {
            fetchDocs();
        }
    };

    const handleDelete = async (id: string, filePath: string) => {
        if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) return;

        // Delete from storage first
        const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([filePath]);

        if (storageError) {
            console.error('Failed to delete file from storage:', storageError);
        }

        // Delete from database
        const { error: dbError } = await supabase.from('documents').delete().eq('id', id);

        if (!dbError) {
            fetchDocs();
        }
    };

    const handleDownload = async (doc: Document) => {
        const { data, error } = await supabase.storage
            .from('documents')
            .download(doc.file_path);

        if (error) {
            console.error('Failed to download:', error);
            alert('Failed to download file');
            return;
        }

        // Create download link
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '--';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const handleProcess = async (documentId: string) => {
        setProcessingDocs(prev => new Set(prev).add(documentId));

        try {
            const response = await fetch('/api/documents/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Processing failed');
            }

            const result = await response.json();

            // Refresh documents to show updated status
            fetchDocs();

            alert(`✅ Document processed successfully!\n\nChunks created: ${result.chunksCreated}\nTokens used: ${result.tokensUsed}`);
        } catch (error) {
            console.error('Processing error:', error);
            alert(error instanceof Error ? error.message : 'Failed to process document');
        } finally {
            setProcessingDocs(prev => {
                const next = new Set(prev);
                next.delete(documentId);
                return next;
            });
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);

        try {
            const response = await fetch(`/api/documents/search?q=${encodeURIComponent(searchQuery)}&method=hybrid&limit=10`);

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            setSearchResults(data.results || []);
        } catch (error) {
            console.error('Search error:', error);
            alert('Search failed');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Vault</h2>
                    <p className="text-slate-500 mt-1">
                        Upload and manage documents for AI knowledge base
                    </p>
                </div>
                <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" /> Upload Document
                </Button>
            </div>

            {/* Semantic Search Test */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Test Semantic Search</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Try searching your documents using natural language
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Ask a question about your documents..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                                <SearchIcon className="mr-2 h-4 w-4" />
                                {isSearching ? 'Searching...' : 'Search'}
                            </Button>
                        </div>
                        {searchResults.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-sm font-medium">Found {searchResults.length} results:</p>
                                {searchResults.map((result, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 rounded border border-slate-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-sm font-medium">{result.documentName}</p>
                                            <Badge variant="secondary" className="text-xs">
                                                {(result.similarity * 100).toFixed(0)}% match
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-slate-700 line-clamp-3">{result.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchQuery && searchResults.length === 0 && !isSearching && (
                            <p className="text-sm text-slate-500 mt-2">No results found. Try processing your documents first.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Visibility</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Uploaded</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {docs.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>
                                        <FileText className="h-4 w-4 text-slate-500" />
                                    </TableCell>
                                    <TableCell className="font-medium max-w-xs truncate">
                                        {doc.name}
                                    </TableCell>
                                    <TableCell>
                                        <div
                                            className="flex items-center space-x-2 cursor-pointer hover:underline"
                                            onClick={() => toggleVisibility(doc)}
                                            title="Click to toggle visibility"
                                        >
                                            {doc.visibility === 'internal' ? (
                                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                                                    <EyeOff className="w-3 h-3 mr-1" /> Internal
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                                    <Eye className="w-3 h-3 mr-1" /> Shared
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {doc.embedding_status === 'pending' && (
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                                Pending
                                            </Badge>
                                        )}
                                        {doc.embedding_status === 'processing' && (
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                                Processing
                                            </Badge>
                                        )}
                                        {doc.embedding_status === 'complete' && (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                                                Ready
                                            </Badge>
                                        )}
                                        {doc.embedding_status === 'error' && (
                                            <Badge variant="secondary" className="bg-red-100 text-red-700">
                                                Error
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                        {formatFileSize(doc.size_bytes)}
                                    </TableCell>
                                    <TableCell className="text-slate-600 text-sm">
                                        {formatDate(doc.created_at)}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {doc.embedding_status === 'pending' && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleProcess(doc.id)}
                                                title="Process with AI (extract text & create embeddings)"
                                                disabled={processingDocs.has(doc.id)}
                                            >
                                                <Sparkles className={`h-4 w-4 ${processingDocs.has(doc.id) ? 'text-slate-400' : 'text-purple-500'}`} />
                                            </Button>
                                        )}
                                        {doc.embedding_status === 'error' && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleProcess(doc.id)}
                                                title="Retry processing"
                                                disabled={processingDocs.has(doc.id)}
                                            >
                                                <Sparkles className="h-4 w-4 text-amber-500" />
                                            </Button>
                                        )}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDownload(doc)}
                                            title="Download"
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDelete(doc.id, doc.file_path)}
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {docs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-16">
                                        <div className="flex flex-col items-center justify-center text-slate-500">
                                            <FileText className="h-12 w-12 mb-3 opacity-30" />
                                            <p className="font-medium">No documents in the Vault</p>
                                            <p className="text-sm mt-1">
                                                Upload documents to build your AI knowledge base
                                            </p>
                                            <Button
                                                onClick={() => setUploadDialogOpen(true)}
                                                className="mt-4"
                                                variant="outline"
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                Upload Your First Document
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Upload Dialog */}
            <UploadDialog
                open={uploadDialogOpen}
                onOpenChange={setUploadDialogOpen}
                onUploadComplete={fetchDocs}
            />
        </div>
    );
}
