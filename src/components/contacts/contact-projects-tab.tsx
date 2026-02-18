'use client'

import { Contact } from '@/types/contact'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useProjectStore } from '@/stores/project-store'
import { Plus, FolderKanban, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

interface ContactProjectsTabProps {
    contact: Contact
}

const STATUS_COLORS = {
    lead: 'bg-purple-100 text-purple-700',
    active: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    on_hold: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-slate-100 text-slate-500',
}

const STATUS_LABELS = {
    lead: 'Lead',
    active: 'Active',
    completed: 'Completed',
    on_hold: 'On Hold',
    archived: 'Archived',
}

export function ContactProjectsTab({ contact }: ContactProjectsTabProps) {
    const router = useRouter()
    const projects = useProjectStore((state) => state.projects)
    const [filter, setFilter] = useState<'all' | 'planning' | 'active' | 'completed' | 'on_hold'>('all')

    const contactProjects = useMemo(() => {
        const filtered = projects.filter(proj => proj.clientId === contact.id)
        if (filter === 'all') return filtered
        return filtered.filter(proj => proj.status === filter)
    }, [projects, contact.id, filter])

    return (
        <div className="space-y-4">
            {/* Header with filters and action */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('all')}
                        className={filter === 'all' ? 'bg-[#3D4A67] hover:bg-[#2D3A57]' : ''}
                    >
                        All
                    </Button>
                    <Button
                        variant={filter === 'planning' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('planning')}
                        className={filter === 'planning' ? 'bg-[#3D4A67] hover:bg-[#2D3A57]' : ''}
                    >
                        Planning
                    </Button>
                    <Button
                        variant={filter === 'active' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('active')}
                        className={filter === 'active' ? 'bg-[#3D4A67] hover:bg-[#2D3A57]' : ''}
                    >
                        Active
                    </Button>
                    <Button
                        variant={filter === 'completed' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('completed')}
                        className={filter === 'completed' ? 'bg-[#3D4A67] hover:bg-[#2D3A57]' : ''}
                    >
                        Completed
                    </Button>
                </div>

                <Button
                    onClick={() => router.push(`/projects/new?contact=${contact.id}`)}
                    className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                </Button>
            </div>

            {/* Project List */}
            {contactProjects.length > 0 ? (
                <div className="space-y-3">
                    {contactProjects.map((project) => (
                        <Card
                            key={project.id}
                            className="border-slate-200 bg-white hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => router.push(`/projects/${project.id}`)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4 flex-1">
                                        <FolderKanban className="h-5 w-5 text-slate-400 mt-1" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium text-[#3D4A67]">
                                                    {project.name}
                                                </div>
                                                <Badge className={STATUS_COLORS[project.status]}>
                                                    {STATUS_LABELS[project.status]}
                                                </Badge>
                                            </div>
                                            {project.description && (
                                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                                    {project.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Started: {new Date(project.createdAt).toLocaleDateString('de-CH')}
                                                </div>
                                                {project.deadline && (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        Deadline: {new Date(project.deadline).toLocaleDateString('de-CH')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500">
                    <FolderKanban className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>No projects yet for this contact.</p>
                    <Button
                        onClick={() => router.push(`/projects/new?contact=${contact.id}`)}
                        variant="outline"
                        className="mt-4"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Project
                    </Button>
                </div>
            )}
        </div>
    )
}
