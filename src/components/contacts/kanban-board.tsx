'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, DragStartEvent } from '@dnd-kit/core'
import { ContactStatus } from '@/types/contact'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { useContactStore } from '@/stores/contact-store'
import { Loader2 } from 'lucide-react'

interface KanbanBoardProps {
    onDeleteContact: (id: string) => void
}

const COLUMNS: ContactStatus[] = ['lead', 'opportunity', 'client', 'churned']

export function KanbanBoard({ onDeleteContact }: KanbanBoardProps) {
    const updateStatus = useContactStore(state => state.updateStatus)
    const allContacts = useContactStore(state => state.allContacts)
    const isLoadingKanban = useContactStore(state => state.isLoadingKanban)
    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10, // Create a small drag threshold to prevent accidental drags
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    )

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string)
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (over && active.id !== over.id) {
            // Find the dragged contact
            const contact = allContacts.find((c) => c.id === active.id)

            // Determine the new status — over.id is the column status string
            const newStatus = over.id as ContactStatus

            if (contact && contact.status !== newStatus && COLUMNS.includes(newStatus)) {
                updateStatus(contact.id, newStatus)
            }
        }

        setActiveId(null)
    }

    const activeContact = activeId ? allContacts.find(c => c.id === activeId) : null

    if (isLoadingKanban) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[#3D4A67]" />
                <span className="ml-2 text-slate-500">Loading board...</span>
            </div>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-[calc(100vh-220px)] gap-4 overflow-x-auto pb-4">
                {COLUMNS.map((colId) => (
                    <KanbanColumn
                        key={colId}
                        id={colId}
                        contacts={allContacts}
                        onDeleteContact={onDeleteContact}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeContact ? (
                    <KanbanCard contact={activeContact} onDelete={() => { }} />
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
