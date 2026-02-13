'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, DragStartEvent } from '@dnd-kit/core'
import { Contact, ContactStatus } from '@/types/contact'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { useContactStore } from '@/stores/contact-store'

interface KanbanBoardProps {
    contacts: Contact[]
    onDeleteContact: (id: string) => void
}

const COLUMNS: ContactStatus[] = ['lead', 'opportunity', 'client', 'churned']

export function KanbanBoard({ contacts, onDeleteContact }: KanbanBoardProps) {
    const updateStatus = useContactStore(state => state.updateStatus)
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
            const contact = contacts.find((c) => c.id === active.id)

            // Determine the new status
            // If dropped on a column, over.id is the status string
            // If dropped on a card, verify implementation (usually simpler to just drop on column in basic version)
            // For this implementation, we simplified KanbanColumn to be the droppable area with id=status
            const newStatus = over.id as ContactStatus

            if (contact && contact.status !== newStatus && COLUMNS.includes(newStatus)) {
                updateStatus(contact.id, newStatus)
            }
        }

        setActiveId(null)
    }

    const activeContact = activeId ? contacts.find(c => c.id === activeId) : null

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
                        contacts={contacts}
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
