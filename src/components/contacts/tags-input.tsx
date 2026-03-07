'use client'

import { useState } from 'react'
import { useContactStore } from '@/stores/contact-store'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface TagsInputProps {
    contactId: string
    tags: string[]
}

export function TagsInput({ contactId, tags }: TagsInputProps) {
    const [inputValue, setInputValue] = useState('')
    const { updateContact } = useContactStore()

    const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault()
            const newTag = inputValue.trim()
            const isDuplicate = tags.some(t => t.toLowerCase() === newTag.toLowerCase())
            if (!isDuplicate) {
                try {
                    await updateContact(contactId, { tags: [...tags, newTag] })
                } catch (error) {
                    console.error('Failed to add tag:', error)
                    toast.error('Failed to add tag')
                }
            }
            setInputValue('')
        }
    }

    const handleRemoveTag = async (tagToRemove: string) => {
        try {
            await updateContact(contactId, { tags: tags.filter(t => t !== tagToRemove) })
        } catch (error) {
            console.error('Failed to remove tag:', error)
            toast.error('Failed to remove tag')
        }
    }

    return (
        <div className="space-y-3">
            {/* Tags Display */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                        <Badge
                            key={tag}
                            variant="secondary"
                            className="bg-slate-100 text-slate-700 hover:bg-slate-200 pr-1"
                        >
                            {tag}
                            <button
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Tag Input */}
            <Input
                placeholder="Add a tag (press Enter)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleAddTag}
                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
            />
        </div>
    )
}
