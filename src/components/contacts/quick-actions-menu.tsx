'use client'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
    MoreHorizontal,
    Edit,
    Eye,
    Copy,
    Trash2,
    ExternalLink,
    Mail,
    CheckCircle2
} from "lucide-react"
import { Contact } from "@/types/contact"
import { toast } from "sonner"
import Link from "next/link"

interface QuickActionsMenuProps {
    contact: Contact
    onEdit?: () => void
    onDelete?: () => void
}

export function QuickActionsMenu({ contact, onEdit, onDelete }: QuickActionsMenuProps) {
    const copyEmail = () => {
        navigator.clipboard.writeText(contact.email)
        toast.success(`Email copied: ${contact.email}`)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                    <Link href={`/contacts/${contact.id}`} className="flex items-center cursor-pointer">
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyEmail} className="cursor-pointer">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Email
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {onEdit && (
                    <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Contact
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {onDelete && (
                    <DropdownMenuItem
                        onClick={onDelete}
                        className="text-red-600 focus:text-red-600 cursor-pointer"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Archive
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
