'use client'

import { useContactStore } from "@/stores/contact-store"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Filter, X } from "lucide-react"
import { STATUS_LABELS, ContactStatus } from "@/types/contact"
import { Badge } from "@/components/ui/badge"

export function AdvancedFilters() {
    const { contacts, filters, setFilters } = useContactStore()

    // Get all unique tags from contacts
    const allTagsArray = contacts.reduce((acc, contact) => {
        contact.tags.forEach(tag => acc.add(tag))
        return acc
    }, new Set<string>())
    const allTags = Array.from(allTagsArray).sort()

    const activeFilterCount =
        (filters.statuses?.length || 0) +
        (filters.tags?.length || 0)

    const toggleStatus = (status: ContactStatus) => {
        const current = filters.statuses || []
        const next = current.includes(status)
            ? current.filter(s => s !== status)
            : [...current, status]
        setFilters({ statuses: next })
    }

    const toggleTag = (tag: string) => {
        const current = filters.tags || []
        const next = current.includes(tag)
            ? current.filter(t => t !== tag)
            : [...current, tag]
        setFilters({ tags: next })
    }

    const clearFilters = () => {
        setFilters({ status: 'all', statuses: [], tags: [] })
    }

    return (
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 border-slate-300 relative">
                        <Filter className="h-4 w-4 mr-2" />
                        More Filters
                        {activeFilterCount > 0 && (
                            <Badge className="ml-2 bg-[#3D4A67] h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 text-slate-900 border-slate-200">
                    <DropdownMenuLabel>By Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <DropdownMenuCheckboxItem
                            key={value}
                            checked={filters.statuses?.includes(value as ContactStatus)}
                            onCheckedChange={() => toggleStatus(value as ContactStatus)}
                            className="cursor-pointer"
                        >
                            {label}
                        </DropdownMenuCheckboxItem>
                    ))}

                    {allTags.length > 0 && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>By Tag</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {allTags.map((tag) => (
                                <DropdownMenuCheckboxItem
                                    key={tag}
                                    checked={filters.tags?.includes(tag)}
                                    onCheckedChange={() => toggleTag(tag)}
                                    className="cursor-pointer"
                                >
                                    {tag}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {activeFilterCount > 0 && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 text-slate-500 hover:text-slate-900"
                >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                </Button>
            )}
        </div>
    )
}
