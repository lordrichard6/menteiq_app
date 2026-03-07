'use client'

import { useState } from 'react'
import { useContactStore } from '@/stores/contact-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface NotesSectionProps {
    contactId: string
    notes: string[]
}

export function NotesSection({ contactId, notes }: NotesSectionProps) {
    const [newNote, setNewNote] = useState('')
    const { updateContact } = useContactStore()

    const handleAddNote = async () => {
        if (!newNote.trim()) return

        const timestamp = format(new Date(), 'dd-MM-yyyy HH:mm')
        const noteWithTimestamp = `${timestamp} - ${newNote.trim()}`
        try {
            await updateContact(contactId, { notes: [noteWithTimestamp, ...notes] })
            setNewNote('')
        } catch {
            toast.error('Failed to save note. Please try again.')
        }
    }

    const handleDeleteNote = async (index: number) => {
        const updatedNotes = notes.filter((_, i) => i !== index)
        try {
            await updateContact(contactId, { notes: updatedNotes })
        } catch {
            toast.error('Failed to delete note. Please try again.')
        }
    }

    return (
        <div className="space-y-4">
            {/* Add Note */}
            <div className="space-y-2">
                <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 min-h-[100px]"
                />
                <Button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white"
                >
                    Add Note
                </Button>
            </div>

            {/* Notes List */}
            {notes.length > 0 ? (
                <div className="space-y-3">
                    {notes.map((note, index) => (
                        <div
                            key={index}
                            className="p-4 bg-slate-50 rounded-lg border border-slate-200 group hover:border-slate-300 transition-colors"
                        >
                            <div className="flex justify-between items-start gap-4">
                                <p className="text-slate-700 whitespace-pre-wrap flex-1">{note}</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteNote(index)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-slate-500 text-center py-8">No notes yet. Add your first note above.</p>
            )}
        </div>
    )
}
