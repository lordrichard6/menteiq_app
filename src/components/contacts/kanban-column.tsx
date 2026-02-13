'use client'

import { useDroppable } from '@dnd-kit/core'
import { Contact, ContactStatus, STATUS_COLORS, STATUS_LABELS } from '@/types/contact'
import { KanbanCard } from './kanban-card'
import { Badge } from "@/components/ui/badge"

interface KanbanColumnProps {
    id: ContactStatus
    contacts: Contact[]
    onDeleteContact: (id: string) => void
}

export function KanbanColumn({ id, contacts, onDeleteContact }: KanbanColumnProps) {
    const { setNodeRef } = useDroppable({ id })

    // Filter contacts for this column
    const columnContacts = contacts.filter((contact) => contact.status === id)

    return (
        <div ref={setNodeRef} className="flex-1 min-w-[300px] h-full flex flex-col bg-slate-50/50 rounded-lg border border-slate-100 p-2">
            <div className="flex items-center justify-between px-2 py-3 mb-2">
                <h3 className="font-medium text-slate-700">{STATUS_LABELS[id]}</h3>
                <Badge variant="outline" className={`${STATUS_COLORS[id]} border-0 font-medium`}>
                    {columnContacts.length}
                </Badge>
            </div>

            <div className="flex-1 overflow-y-auto px-1 space-y-3 pb-4">
                {columnContacts.map((contact) => (
                    <KanbanCard key={contact.id} contact={contact} onDelete={onDeleteContact} />
                ))}
                {columnContacts.length === 0 && (
                    <div className="h-24 flex items-center justify-center text-xs text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                        Drop here
                    </div>
                )}
            </div>
        </div>
    )
}
