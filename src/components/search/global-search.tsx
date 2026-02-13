'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Search, User, Briefcase, CheckSquare, FileText, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResult {
    id: string
    type: 'contact' | 'project' | 'task' | 'invoice'
    title: string
    subtitle?: string
    url: string
}

export function GlobalSearch() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    // Debounced search
    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)

        const timeout = setTimeout(async () => {
            await performSearch(query)
        }, 300) // 300ms debounce

        return () => clearTimeout(timeout)
    }, [query])

    const performSearch = async (searchQuery: string) => {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

            if (!profile?.tenant_id) return

            const searchResults: SearchResult[] = []

            // Search contacts
            const { data: contacts } = await supabase
                .from('contacts')
                .select('id, first_name, last_name, company_name, email, is_company')
                .eq('tenant_id', profile.tenant_id)
                .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
                .limit(5)

            if (contacts) {
                searchResults.push(
                    ...contacts.map((contact) => ({
                        id: contact.id,
                        type: 'contact' as const,
                        title: contact.is_company
                            ? contact.company_name || 'Unnamed Company'
                            : `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
                            'Unnamed Contact',
                        subtitle: contact.email || undefined,
                        url: `/contacts/${contact.id}`,
                    }))
                )
            }

            // Search projects
            const { data: projects } = await supabase
                .from('projects')
                .select('id, name, description')
                .eq('tenant_id', profile.tenant_id)
                .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
                .limit(5)

            if (projects) {
                searchResults.push(
                    ...projects.map((project) => ({
                        id: project.id,
                        type: 'project' as const,
                        title: project.name,
                        subtitle: project.description || undefined,
                        url: `/projects/${project.id}`,
                    }))
                )
            }

            // Search tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('id, title, description')
                .eq('tenant_id', profile.tenant_id)
                .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
                .limit(5)

            if (tasks) {
                searchResults.push(
                    ...tasks.map((task) => ({
                        id: task.id,
                        type: 'task' as const,
                        title: task.title,
                        subtitle: task.description || undefined,
                        url: `/tasks/${task.id}`,
                    }))
                )
            }

            // Search invoices
            const { data: invoices } = await supabase
                .from('invoices')
                .select('id, invoice_number, description')
                .eq('tenant_id', profile.tenant_id)
                .or(`invoice_number.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
                .limit(5)

            if (invoices) {
                searchResults.push(
                    ...invoices.map((invoice) => ({
                        id: invoice.id,
                        type: 'invoice' as const,
                        title: `Invoice ${invoice.invoice_number}`,
                        subtitle: invoice.description || undefined,
                        url: `/invoices/${invoice.id}`,
                    }))
                )
            }

            setResults(searchResults)
            setSelectedIndex(0)
        } catch (error) {
            console.error('Search error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSelect = (result: SearchResult) => {
        router.push(result.url)
        setQuery('')
        setResults([])
        setIsOpen(false)
        inputRef.current?.blur()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % results.length)
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
                break
            case 'Enter':
                e.preventDefault()
                if (results[selectedIndex]) {
                    handleSelect(results[selectedIndex])
                }
                break
            case 'Escape':
                e.preventDefault()
                setIsOpen(false)
                setQuery('')
                setResults([])
                inputRef.current?.blur()
                break
        }
    }

    const getIcon = (type: SearchResult['type']) => {
        switch (type) {
            case 'contact':
                return <User className="h-4 w-4" />
            case 'project':
                return <Briefcase className="h-4 w-4" />
            case 'task':
                return <CheckSquare className="h-4 w-4" />
            case 'invoice':
                return <FileText className="h-4 w-4" />
        }
    }

    const getTypeColor = (type: SearchResult['type']) => {
        switch (type) {
            case 'contact':
                return 'text-blue-600'
            case 'project':
                return 'text-purple-600'
            case 'task':
                return 'text-green-600'
            case 'invoice':
                return 'text-orange-600'
        }
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Search contacts, projects, tasks..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="pl-10 pr-10 bg-white border-slate-300"
                />
                {(isLoading || query) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : (
                            <button
                                onClick={() => {
                                    setQuery('')
                                    setResults([])
                                    setIsOpen(false)
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Results dropdown */}
            {isOpen && results.length > 0 && (
                <Card className="absolute top-full mt-2 w-full z-50 border-slate-200 shadow-lg max-h-96 overflow-y-auto">
                    <div className="p-2">
                        {results.map((result, index) => (
                            <button
                                key={`${result.type}-${result.id}`}
                                onClick={() => handleSelect(result)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={cn(
                                    'w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors',
                                    index === selectedIndex
                                        ? 'bg-slate-100'
                                        : 'hover:bg-slate-50'
                                )}
                            >
                                <div className={cn('mt-0.5', getTypeColor(result.type))}>
                                    {getIcon(result.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-slate-900 truncate">
                                            {result.title}
                                        </p>
                                        <span className="text-xs text-slate-500 capitalize flex-shrink-0">
                                            {result.type}
                                        </span>
                                    </div>
                                    {result.subtitle && (
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                            {result.subtitle}
                                        </p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>
            )}

            {/* No results */}
            {isOpen && query.length >= 2 && !isLoading && results.length === 0 && (
                <Card className="absolute top-full mt-2 w-full z-50 border-slate-200 shadow-lg">
                    <div className="p-4 text-center text-slate-500">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No results found for "{query}"</p>
                    </div>
                </Card>
            )}
        </div>
    )
}
