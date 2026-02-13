'use client'

import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Settings2 } from "lucide-react"
import { useContactStore } from "@/stores/contact-store"

const COLUMNS = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'company', label: 'Company' },
    { id: 'status', label: 'Status' },
    { id: 'phone', label: 'Phone' },
    { id: 'created_at', label: 'Date Added' },
]

export function ColumnSettings() {
    const { visibleColumns, toggleColumn } = useContactStore()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 border-slate-300">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Columns
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-slate-900 border-slate-200">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {COLUMNS.map((column) => (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={visibleColumns.includes(column.id)}
                        onCheckedChange={() => toggleColumn(column.id)}
                        className="cursor-pointer"
                    >
                        {column.label}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
