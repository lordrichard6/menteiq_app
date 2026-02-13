'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    Search,
    Home,
    User,
    Users,
    Briefcase,
    CheckSquare,
    FileText,
    MessageSquare,
    Settings,
    LogOut,
    Plus,
    Calendar,
    DollarSign,
    Loader2,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Command {
    id: string
    label: string
    description?: string
    icon: React.ReactNode
    action: () => void
    category: 'navigation' | 'create' | 'search' | 'settings'
}

interface CommandPaletteProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [isSearching, setIsSearching] = useState(false)
    const [searchResults, setSearchResults] = useState<any[]>([])
    const router = useRouter()

    // Static commands (navigation & actions)
    const staticCommands: Command[] = [
        // Navigation
        {
            id: 'nav-dashboard',
            label: 'Dashboard',
            description: 'Go to dashboard',
            icon: <Home className="h-4 w-4" />,
            action: () => {
                router.push('/dashboard')
                onOpenChange(false)
            },
            category: 'navigation',
        },
        {
            id: 'nav-contacts',
            label: 'Contacts',
            description: 'View all contacts',
            icon: <Users className="h-4 w-4" />,
            action: () => {
                router.push('/contacts')
                onOpenChange(false)
            },
            category: 'navigation',
        },
        {
            id: 'nav-projects',
            label: 'Projects',
            description: 'View all projects',
            icon: <Briefcase className="h-4 w-4" />,
            action: () => {
                router.push('/projects')
                onOpenChange(false)
            },
            category: 'navigation',
        },
        {
            id: 'nav-tasks',
            label: 'Tasks',
            description: 'View all tasks',
            icon: <CheckSquare className="h-4 w-4" />,
            action: () => {
                router.push('/tasks')
                onOpenChange(false)
            },
            category: 'navigation',
        },
        {
            id: 'nav-invoices',
            label: 'Invoices',
            description: 'View all invoices',
            icon: <FileText className="h-4 w-4" />,
            action: () => {
                router.push('/invoices')
                onOpenChange(false)
            },
            category: 'navigation',
        },
        {
            id: 'nav-chat',
            label: 'AI Chat',
            description: 'Open AI assistant',
            icon: <MessageSquare className="h-4 w-4" />,
            action: () => {
                router.push('/chat')
                onOpenChange(false)
            },
            category: 'navigation',
        },
        {
            id: 'nav-calendar',
            label: 'Calendar',
            description: 'View calendar',
            icon: <Calendar className="h-4 w-4" />,
            action: () => {
                router.push('/calendar')
                onOpenChange(false)
            },
            category: 'navigation',
        },
        {
            id: 'nav-settings',
            label: 'Settings',
            description: 'Open settings',
            icon: <Settings className="h-4 w-4" />,
            action: () => {
                router.push('/settings')
                onOpenChange(false)
            },
            category: 'settings',
        },
        // Create actions
        {
            id: 'create-contact',
            label: 'New Contact',
            description: 'Create a new contact',
            icon: <Plus className="h-4 w-4" />,
            action: () => {
                router.push('/contacts?new=true')
                onOpenChange(false)
            },
            category: 'create',
        },
        {
            id: 'create-project',
            label: 'New Project',
            description: 'Create a new project',
            icon: <Plus className="h-4 w-4" />,
            action: () => {
                router.push('/projects?new=true')
                onOpenChange(false)
            },
            category: 'create',
        },
        {
            id: 'create-task',
            label: 'New Task',
            description: 'Create a new task',
            icon: <Plus className="h-4 w-4" />,
            action: () => {
                router.push('/tasks?new=true')
                onOpenChange(false)
            },
            category: 'create',
        },
        {
            id: 'create-invoice',
            label: 'New Invoice',
            description: 'Create a new invoice',
            icon: <Plus className="h-4 w-4" />,
            action: () => {
                router.push('/invoices?new=true')
                onOpenChange(false)
            },
            category: 'create',
        },
    ]

    // Search for entities when query changes
    useEffect(() => {
        if (query.trim().length < 2) {
            setSearchResults([])
            return
        }

        const timeout = setTimeout(async () => {
            setIsSearching(true)
            await performSearch(query)
            setIsSearching(false)
        }, 300)

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

            const results: any[] = []

            // Search contacts
            const { data: contacts } = await supabase
                .from('contacts')
                .select('id, first_name, last_name, company_name, email, is_company')
                .eq('tenant_id', profile.tenant_id)
                .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
                .limit(3)

            if (contacts) {
                results.push(
                    ...contacts.map((contact) => ({
                        id: `contact-${contact.id}`,
                        label: contact.is_company
                            ? contact.company_name || 'Unnamed Company'
                            : `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
                            'Unnamed Contact',
                        description: contact.email || undefined,
                        icon: <User className="h-4 w-4" />,
                        action: () => {
                            router.push(`/contacts/${contact.id}`)
                            onOpenChange(false)
                        },
                        category: 'search',
                    }))
                )
            }

            // Search projects
            const { data: projects } = await supabase
                .from('projects')
                .select('id, name')
                .eq('tenant_id', profile.tenant_id)
                .ilike('name', `%${searchQuery}%`)
                .limit(3)

            if (projects) {
                results.push(
                    ...projects.map((project) => ({
                        id: `project-${project.id}`,
                        label: project.name,
                        description: 'Project',
                        icon: <Briefcase className="h-4 w-4" />,
                        action: () => {
                            router.push(`/projects/${project.id}`)
                            onOpenChange(false)
                        },
                        category: 'search',
                    }))
                )
            }

            setSearchResults(results)
        } catch (error) {
            console.error('Command palette search error:', error)
        }
    }

    // Filter static commands based on query
    const filteredCommands = staticCommands.filter(
        (cmd) =>
            cmd.label.toLowerCase().includes(query.toLowerCase()) ||
            cmd.description?.toLowerCase().includes(query.toLowerCase())
    )

    // Combine filtered commands and search results
    const allCommands = query.length >= 2 ? [...filteredCommands, ...searchResults] : filteredCommands

    // Reset selection when commands change
    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault()
                    setSelectedIndex((prev) => (prev + 1) % allCommands.length)
                    break
                case 'ArrowUp':
                    e.preventDefault()
                    setSelectedIndex((prev) => (prev - 1 + allCommands.length) % allCommands.length)
                    break
                case 'Enter':
                    e.preventDefault()
                    if (allCommands[selectedIndex]) {
                        allCommands[selectedIndex].action()
                    }
                    break
            }
        },
        [allCommands, selectedIndex]
    )

    // Group commands by category
    const groupedCommands = allCommands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) {
            acc[cmd.category] = []
        }
        acc[cmd.category].push(cmd)
        return acc
    }, {} as Record<string, Command[]>)

    const categoryLabels = {
        navigation: 'Navigation',
        create: 'Create New',
        search: 'Search Results',
        settings: 'Settings',
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 max-w-2xl">
                <div className="flex flex-col max-h-[600px]">
                    {/* Search input */}
                    <div className="p-4 border-b border-slate-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                autoFocus
                                placeholder="Type a command or search..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-10 pr-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                            )}
                        </div>
                    </div>

                    {/* Commands list */}
                    <div className="overflow-y-auto p-2">
                        {Object.entries(groupedCommands).length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No commands found</p>
                            </div>
                        ) : (
                            Object.entries(groupedCommands).map(([category, commands]) => (
                                <div key={category} className="mb-4 last:mb-0">
                                    <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase">
                                        {categoryLabels[category as keyof typeof categoryLabels]}
                                    </div>
                                    <div className="space-y-1">
                                        {commands.map((cmd, index) => {
                                            const globalIndex = allCommands.indexOf(cmd)
                                            return (
                                                <button
                                                    key={cmd.id}
                                                    onClick={() => cmd.action()}
                                                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                    className={cn(
                                                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                                                        globalIndex === selectedIndex
                                                            ? 'bg-[#3D4A67] text-white'
                                                            : 'hover:bg-slate-100 text-slate-900'
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            'flex-shrink-0',
                                                            globalIndex === selectedIndex
                                                                ? 'text-white'
                                                                : 'text-slate-600'
                                                        )}
                                                    >
                                                        {cmd.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate">
                                                            {cmd.label}
                                                        </div>
                                                        {cmd.description && (
                                                            <div
                                                                className={cn(
                                                                    'text-xs truncate',
                                                                    globalIndex === selectedIndex
                                                                        ? 'text-white/70'
                                                                        : 'text-slate-500'
                                                                )}
                                                            >
                                                                {cmd.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-2 border-t border-slate-200 bg-slate-50">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <div className="flex gap-4">
                                <span>
                                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded">
                                        ↑↓
                                    </kbd>{' '}
                                    Navigate
                                </span>
                                <span>
                                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded">
                                        Enter
                                    </kbd>{' '}
                                    Select
                                </span>
                                <span>
                                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded">
                                        Esc
                                    </kbd>{' '}
                                    Close
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
