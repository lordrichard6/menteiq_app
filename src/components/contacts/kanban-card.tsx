'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, Mail, Building2 } from "lucide-react"
import { Contact } from "@/types/contact"
import { useRouter } from 'next/navigation'
import { QuickActionsMenu } from './quick-actions-menu'

interface KanbanCardProps {
    contact: Contact
    onDelete: (id: string) => void
}

export function KanbanCard({ contact, onDelete }: KanbanCardProps) {
    const router = useRouter()
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: contact.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const handleCardClick = (e: React.MouseEvent) => {
        // Only navigate if not clicking on the dropdown menu
        if (!(e.target as HTMLElement).closest('[role="button"]')) {
            router.push(`/contacts/${contact.id}`)
        }
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
            <Card
                className="mb-3 hover:shadow-md transition-shadow cursor-pointer bg-white"
                onClick={handleCardClick}
            >
                <CardHeader className="p-3 pb-0 space-y-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-medium text-sm text-[#3D4A67] line-clamp-1">
                                {contact.isCompany ? contact.companyName : `${contact.firstName} ${contact.lastName}`}
                            </h4>
                            {contact.companyName && (
                                <div className="flex items-center text-xs text-slate-500 mt-1">
                                    <Building2 className="h-3 w-3 mr-1" />
                                    <span className="line-clamp-1">{contact.companyName}</span>
                                </div>
                            )}
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                            <QuickActionsMenu
                                contact={contact}
                                onDelete={() => onDelete(contact.id)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-3">
                    <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex items-center text-xs text-slate-500">
                            <Mail className="h-3 w-3 mr-1.5" />
                            <span className="truncate">{contact.email}</span>
                        </div>
                        {contact.phone && (
                            <div className="flex items-center text-xs text-slate-500">
                                <Phone className="h-3 w-3 mr-1.5" />
                                <span>{contact.phone}</span>
                            </div>
                        )}
                    </div>

                    {contact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                            {contact.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200">
                                    {tag}
                                </Badge>
                            ))}
                            {contact.tags.length > 2 && (
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-100 text-slate-600">
                                    +{contact.tags.length - 2}
                                </Badge>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
