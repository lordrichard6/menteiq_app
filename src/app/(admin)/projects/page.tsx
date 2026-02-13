'use client'

import { useState, useEffect } from 'react'
import { useProjectStore } from '@/stores/project-store'
import { useContactStore } from '@/stores/contact-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ProjectKanbanBoard } from '@/components/projects/project-kanban-board'
import { DeadlineBadge } from '@/components/projects/deadline-badge'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, ProjectStatus } from '@/types/project'
import { PROJECT_TEMPLATES, ProjectTemplate } from '@/types/project-templates'
import { FolderPlus, Trash2, Loader2, Calendar, User, Search, ArrowUpDown, ChevronLeft, ChevronRight, LayoutGrid, Kanban, BookTemplate } from 'lucide-react'
import { useTaskStore } from '@/stores/task-store'
import { format } from 'date-fns'
import Link from 'next/link'

export default function ProjectsPage() {
    const {
        projects,
        addProject,
        archiveProject,
        updateProject,
        fetchProjects,
        isLoading,
        filters,
        setFilters,
        sortConfig,
        setSort,
        currentPage,
        setPage,
        pageSize,
        setPageSize,
        totalCount
    } = useProjectStore()
    const { contacts, fetchContacts } = useContactStore()
    const { addTask } = useTaskStore()

    // Create Project Form State
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [clientId, setClientId] = useState<string>('')
    const [deadline, setDeadline] = useState('')
    const [status, setStatus] = useState<ProjectStatus>('lead')
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // View Mode State
    const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid')

    // Archiving State
    const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
    const [projectToArchiveId, setProjectToArchiveId] = useState<string | null>(null)

    // Search State
    const [localSearch, setLocalSearch] = useState(filters.search)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== filters.search) {
                setFilters({ search: localSearch })
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [localSearch, setFilters, filters.search])

    // Update local search when filters change externally
    useEffect(() => {
        if (localSearch !== filters.search) {
            setLocalSearch(filters.search)
        }
    }, [filters.search, localSearch])

    // Fetch data on mount
    useEffect(() => {
        fetchProjects()
        fetchContacts()
    }, [fetchProjects, fetchContacts])

    const handleTemplateChange = (templateId: string) => {
        setSelectedTemplateId(templateId)
        if (templateId === 'none') return

        const template = PROJECT_TEMPLATES.find(t => t.id === templateId)
        if (template) {
            setName(template.name)
            setStatus(template.defaultStatus)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || isSubmitting) return

        setIsSubmitting(true)
        try {
            const newProject = await addProject({
                name,
                description: description || undefined,
                clientId: clientId || undefined,
                deadline: deadline ? new Date(deadline) : undefined,
                status
            })

            // If a template was selected, create the initial tasks
            if (newProject && selectedTemplateId !== 'none') {
                const template = PROJECT_TEMPLATES.find(t => t.id === selectedTemplateId)
                if (template) {
                    for (const task of template.tasks) {
                        await addTask({
                            projectId: newProject.id,
                            title: task.name,
                            description: task.description,
                            priority: task.priority,
                            status: 'todo',
                            contactId: clientId || undefined
                        })
                    }
                }
            }

            setOpen(false)
            // Reset form
            setName('')
            setDescription('')
            setClientId('')
            setDeadline('')
            setStatus('lead')
            setSelectedTemplateId('none')
        } catch (error) {
            console.error('Error creating project:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleArchive = async () => {
        if (!projectToArchiveId) return
        await archiveProject(projectToArchiveId)
        setIsArchiveDialogOpen(false)
        setProjectToArchiveId(null)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#3D4A67]">Projects</h1>
                    <p className="text-slate-600">Track your client projects</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-sm mr-2">
                        <Button
                            variant={viewMode === 'grid' ? "secondary" : "ghost"}
                            size="sm"
                            className={`h-8 px-3 gap-2 ${viewMode === 'grid' ? 'bg-slate-100 text-[#3D4A67]' : 'text-slate-500'}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            <span className="hidden sm:inline">Grid</span>
                        </Button>
                        <Button
                            variant={viewMode === 'kanban' ? "secondary" : "ghost"}
                            size="sm"
                            className={`h-8 px-3 gap-2 ${viewMode === 'kanban' ? 'bg-slate-100 text-[#3D4A67]' : 'text-slate-500'}`}
                            onClick={() => setViewMode('kanban')}
                        >
                            <Kanban className="h-4 w-4" />
                            <span className="hidden sm:inline">Kanban</span>
                        </Button>
                    </div>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#9EAE8E] hover:bg-[#7E8E6E] text-white gap-2">
                                <FolderPlus className="h-4 w-4" />
                                New Project
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle className="text-[#3D4A67]">Create New Project</DialogTitle>
                                    <DialogDescription>Add a new project to track.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="template">Project Template (Optional)</Label>
                                        <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                                            <SelectTrigger id="template" className="border-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <BookTemplate className="h-4 w-4 text-slate-400" />
                                                    <SelectValue placeholder="Select a template..." />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No Template (Blank Project)</SelectItem>
                                                {PROJECT_TEMPLATES.map(template => (
                                                    <SelectItem key={template.id} value={template.id}>
                                                        {template.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-slate-400 px-1">Selecting a template will pre-fill details and create initial tasks.</p>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Project Name *</Label>
                                        <Input
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Website Redesign"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Input
                                            id="description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Project description..."
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="client">Client</Label>
                                        <Select value={clientId} onValueChange={setClientId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select client..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {contacts.map(contact => (
                                                    <SelectItem key={contact.id} value={contact.id}>
                                                        {contact.isCompany ? contact.companyName : `${contact.firstName} ${contact.lastName}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="deadline">Deadline</Label>
                                        <Input
                                            id="deadline"
                                            type="date"
                                            value={deadline}
                                            onChange={(e) => setDeadline(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="status">Status</Label>
                                        <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
                                    <Button type="submit" className="bg-[#9EAE8E] hover:bg-[#7E8E6E]" disabled={isSubmitting}>
                                        {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Project'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm md:flex-row md:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search projects..."
                        className="pl-10 bg-slate-50 border-slate-200"
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={filters.status}
                        onValueChange={(v) => setFilters({ status: v as ProjectStatus | 'all' })}
                    >
                        <SelectTrigger className="w-[140px] bg-white border-slate-200">
                            <SelectValue placeholder="Status: All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.clientId}
                        onValueChange={(v) => setFilters({ clientId: v })}
                    >
                        <SelectTrigger className="w-[180px] bg-white border-slate-200">
                            <SelectValue placeholder="Client: All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Clients</SelectItem>
                            {contacts.map((contact) => (
                                <SelectItem key={contact.id} value={contact.id}>
                                    {contact.isCompany ? contact.companyName : `${contact.firstName} ${contact.lastName}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={`${sortConfig.column}-${sortConfig.direction}`}
                        onValueChange={(v) => {
                            const [col, dir] = v.split('-')
                            if (col !== sortConfig.column || dir !== sortConfig.direction) {
                                setSort(col as any)
                            }
                        }}
                    >
                        <SelectTrigger className="w-[180px] bg-white border-slate-200 text-sm">
                            <ArrowUpDown className="h-4 w-4 mr-2 opacity-50" />
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="created_at-desc">Newest First</SelectItem>
                            <SelectItem value="created_at-asc">Oldest First</SelectItem>
                            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                            <SelectItem value="deadline-asc">Deadline (Soonest)</SelectItem>
                            <SelectItem value="deadline-desc">Deadline (Furthest)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#3D4A67] mb-4" />
                    <p className="text-slate-500 font-medium">Loading projects...</p>
                </div>
            ) : projects.length === 0 ? (
                <Card className="border-slate-200 bg-white shadow-sm">
                    <CardContent className="py-20 flex flex-col items-center justify-center text-center">
                        <div className="bg-slate-50 p-4 rounded-full mb-4">
                            <Search className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-1">No projects found</h3>
                        <p className="text-slate-500 max-w-xs">
                            {filters.search || filters.status !== 'all' || filters.clientId !== 'all'
                                ? "No projects match your current filters. Try adjusting them."
                                : "Get started by creating your first project."}
                        </p>
                        {!filters.search && filters.status === 'all' && filters.clientId === 'all' && (
                            <Button className="mt-6 bg-[#9EAE8E] hover:bg-[#7E8E6E]" onClick={() => setOpen(true)}>
                                Create Project
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : viewMode === 'grid' ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                        <Card key={project.id} className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                            <CardHeader className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                    <Link href={`/projects/${project.id}`} className="hover:underline">
                                        <CardTitle className="text-[#3D4A67] font-bold line-clamp-1">{project.name}</CardTitle>
                                    </Link>
                                    <Select
                                        value={project.status}
                                        onValueChange={(v) => updateProject(project.id, { status: v as ProjectStatus })}
                                    >
                                        <SelectTrigger className="w-auto h-7 border-0 p-0 hover:bg-transparent shadow-none">
                                            <Badge className={`${PROJECT_STATUS_COLORS[project.status]} border-0`}>
                                                {PROJECT_STATUS_LABELS[project.status]}
                                            </Badge>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {project.description && (
                                    <CardDescription className="text-slate-500 line-clamp-2 min-h-[2.5rem]">
                                        {project.description}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="pt-0 space-y-4">
                                <div className="space-y-2">
                                    {project.clientName && (
                                        <div className="flex items-center text-sm text-slate-600">
                                            <User className="h-4 w-4 mr-2 text-slate-400" />
                                            <span className="truncate">{project.clientName}</span>
                                        </div>
                                    )}
                                    {project.deadline && (
                                        <div className="flex items-center text-sm text-slate-600">
                                            <DeadlineBadge deadline={project.deadline} />
                                        </div>
                                    )}
                                </div>
                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <Link href={`/projects/${project.id}`} className="text-sm font-medium text-[#9EAE8E] hover:underline">
                                        View details
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                        onClick={() => {
                                            setProjectToArchiveId(project.id)
                                            setIsArchiveDialogOpen(true)
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <ProjectKanbanBoard
                    projects={projects}
                    onStatusChange={updateProject}
                />
            )}

            {/* Pagination */}
            {!isLoading && projects.length > 0 && (
                <div className="flex flex-col gap-4 items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm sm:flex-row">
                    <div className="text-sm text-slate-500">
                        Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="font-medium">{totalCount}</span> projects
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500 whitespace-nowrap">Rows</span>
                            <Select
                                value={pageSize.toString()}
                                onValueChange={(v) => setPageSize(parseInt(v))}
                            >
                                <SelectTrigger className="w-[70px] h-8 bg-white border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[12, 24, 48, 100].map((size) => (
                                        <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-[#3D4A67] border-slate-200"
                                onClick={() => setPage(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center justify-center min-w-[32px] font-medium text-sm text-[#3D4A67]">
                                {currentPage}
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-[#3D4A67] border-slate-200"
                                onClick={() => setPage(currentPage + 1)}
                                disabled={currentPage * pageSize >= totalCount}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Archive Dialog */}
            <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#3D4A67]">Archive Project?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will move the project to your archive. You can still access its history later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleArchive}
                            className="bg-red-600 hover:bg-red-700 text-white border-0"
                        >
                            Archive
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
