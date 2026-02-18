'use client'

import { useContactStore } from '@/stores/contact-store'
import { useProjectStore } from '@/stores/project-store'
import { useTaskStore } from '@/stores/task-store'
import { useChatStore } from '@/stores/chat-store'
import { mockContacts, mockProjects, mockTasks, mockConversations } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Database, Trash2 } from 'lucide-react'
import { useState } from 'react'

export function SeedDataButton() {
    const [seeded, setSeeded] = useState(false)
    const addContact = useContactStore((state) => state.addContact)
    const addProject = useProjectStore((state) => state.addProject)
    const addTask = useTaskStore((state) => state.addTask)
    const createConversation = useChatStore((state) => state.createConversation)
    const addMessage = useChatStore((state) => state.addMessage)

    const contacts = useContactStore((state) => state.contacts)
    const projects = useProjectStore((state) => state.projects)
    const tasks = useTaskStore((state) => state.tasks)
    const conversations = useChatStore((state) => state.conversations)

    const hasData = contacts.length > 0 || projects.length > 0 || tasks.length > 0 || conversations.length > 0

    const handleSeed = async () => {
        // Add contacts
        mockContacts.forEach((contact) => {
            addContact({
                firstName: contact.firstName,
                lastName: contact.lastName,
                isCompany: contact.isCompany,
                companyName: contact.companyName,
                email: contact.email,
                phone: contact.phone,
                status: contact.status,
                tags: contact.tags,
            })
        })

        // Add projects
        mockProjects.forEach((project) => {
            addProject({
                name: project.name,
                description: project.description,
                status: project.status,
            })
        })

        // Add tasks
        mockTasks.forEach((task) => {
            addTask({
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
            })
        })

        // Add conversations with messages
        for (const conv of mockConversations) {
            const newConv = await createConversation({ title: conv.title })
            if (newConv) {
                conv.messages.forEach((msg) => {
                    addMessage(newConv.id, { role: msg.role, content: msg.content })
                })
            }
        }

        setSeeded(true)
    }

    const handleClear = () => {
        // Clear localStorage
        localStorage.removeItem('orbitcrm-contacts')
        localStorage.removeItem('orbitcrm-projects')
        localStorage.removeItem('orbitcrm-tasks')
        localStorage.removeItem('orbitcrm-chat')
        // Reload page to reset stores
        window.location.reload()
    }

    if (seeded) {
        return (
            <Button
                variant="outline"
                size="sm"
                disabled
                className="text-[#9EAE8E] border-[#9EAE8E]"
            >
                ✓ Data Seeded
            </Button>
        )
    }

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handleSeed}
                className="gap-2 border-[#3D4A67] text-[#3D4A67] hover:bg-[#3D4A67]/10"
            >
                <Database className="h-4 w-4" />
                Load Demo Data
            </Button>
            {hasData && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    className="gap-2 border-[#D1855C] text-[#D1855C] hover:bg-[#D1855C]/10"
                >
                    <Trash2 className="h-4 w-4" />
                    Clear All
                </Button>
            )}
        </div>
    )
}
