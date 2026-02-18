'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProjectStore } from '@/stores/project-store'
import { useContactStore } from '@/stores/contact-store'
import { useTaskStore } from '@/stores/task-store'
import { useInvoiceStore } from '@/stores/invoice-store'
import { useDocumentStore } from '@/stores/document-store'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
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
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, ProjectStatus } from '@/types/project'
import { TASK_PRIORITY_COLORS } from '@/types/task'
import {
    ChevronLeft,
    Calendar,
    User,
    Clock,
    Edit,
    Archive,
    CheckCircle2,
    Briefcase,
    Plus,
    FileText,
    Download,
    FileIcon,
    Lock,
    Trash2,
    PlusCircle,
    Loader2
} from 'lucide-react'
import { AddTaskDialog } from '@/components/projects/add-task-dialog'
import { UploadDocumentDialog } from '@/components/projects/upload-document-dialog'
import { ActivityTimeline } from '@/components/projects/activity-timeline'
import { CreateInvoiceDialog } from '@/components/projects/create-invoice-dialog'
import { ProjectTeamSection } from '@/components/projects/project-team-section'
import { ProjectBudgetStats } from '@/components/projects/project-budget-stats'
import { ProjectTimeTab } from '@/components/time/project-time-tab'
import { MilestoneSection } from '@/components/projects/milestone-section'
import { ProjectTimeline } from '@/components/projects/project-timeline-view'
import { format } from 'date-fns'
import Link from 'next/link'

export default function ProjectDetailPage() {
    const params = useParams()
    const router = useRouter()
    const projectId = params.id as string
    const { getProject, fetchProjects, isLoading, updateProject } = useProjectStore()
    const { contacts, fetchContacts } = useContactStore()
    const { tasks, fetchTasks, updateStatus } = useTaskStore()
    const { invoices, fetchInvoices } = useInvoiceStore()
    const { documents, fetchDocuments } = useDocumentStore()
    const project = getProject(projectId)
    const completedTasks = tasks.filter(t => t.status === 'done').length
    const totalTasks = tasks.length
    const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    // Edit Form State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [editName, setEditName] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [editClientId, setEditClientId] = useState('')
    const [editDeadline, setEditDeadline] = useState('')
    const [editStatus, setEditStatus] = useState<ProjectStatus>('lead')
    const [editBudgetAmount, setEditBudgetAmount] = useState<string>('0')
    const [editBudgetCurrency, setEditBudgetCurrency] = useState<string>('CHF')
    const [editIsRecurring, setEditIsRecurring] = useState(false)
    const [editRecurrenceInterval, setEditRecurrenceInterval] = useState<'monthly' | 'quarterly' | 'yearly' | 'fixed_interval'>('monthly')
    const [editCustomFields, setEditCustomFields] = useState<{ id: string; key: string; value: string }[]>([])
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

    useEffect(() => {
        if (project) {
            if (editName !== project.name) setEditName(project.name)
            if (editDescription !== (project.description || '')) setEditDescription(project.description || '')
            if (editClientId !== (project.clientId || '')) setEditClientId(project.clientId || '')
            const formattedDeadline = project.deadline ? project.deadline.toISOString().split('T')[0] : ''
            if (editDeadline !== formattedDeadline) setEditDeadline(formattedDeadline)
            if (editStatus !== project.status) setEditStatus(project.status)
            if (editBudgetAmount !== (project.budget_amount?.toString() || '0')) setEditBudgetAmount(project.budget_amount?.toString() || '0')
            if (editBudgetCurrency !== (project.budget_currency || 'CHF')) setEditBudgetCurrency(project.budget_currency || 'CHF')
            if (editIsRecurring !== (project.is_recurring || false)) setEditIsRecurring(project.is_recurring || false)
            if (editRecurrenceInterval !== (project.recurrence_interval || 'monthly')) setEditRecurrenceInterval(project.recurrence_interval || 'monthly')

            // Sync custom fields
            const fields = Object.entries(project.custom_fields || {}).map(([key, value]) => ({
                id: Math.random().toString(36).substr(2, 9),
                key,
                value: String(value)
            }))
            if (JSON.stringify(fields.map(f => ({ k: f.key, v: f.value }))) !==
                JSON.stringify(editCustomFields.map(f => ({ k: f.key, v: f.value })))) {
                setEditCustomFields(fields)
            }
        }
    }, [project, editName, editDescription, editClientId, editDeadline, editStatus, editBudgetAmount, editBudgetCurrency, editIsRecurring, editRecurrenceInterval])

    useEffect(() => {
        fetchProjects()
        fetchContacts()
        fetchTasks(projectId)
        fetchInvoices(projectId)
        fetchDocuments(projectId)
    }, [fetchProjects, fetchContacts, fetchTasks, fetchInvoices, fetchDocuments, projectId])

    const handleSubmitEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editName || isSubmittingEdit) return

        setIsSubmittingEdit(true)
        await updateProject(projectId, {
            name: editName,
            description: editDescription,
            clientId: editClientId,
            deadline: editDeadline ? new Date(editDeadline) : undefined,
            status: editStatus,
            budget_amount: parseFloat(editBudgetAmount) || 0,
            budget_currency: editBudgetCurrency,
            is_recurring: editIsRecurring,
            recurrence_interval: editIsRecurring ? editRecurrenceInterval : undefined,
            custom_fields: editCustomFields.reduce((acc, field) => {
                if (field.key.trim()) acc[field.key.trim()] = field.value
                return acc
            }, {} as Record<string, any>)
        })
        setIsSubmittingEdit(false)
        setIsEditDialogOpen(false)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3D4A67]"></div>
            </div>
        )
    }

    if (!project) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Back to Projects
                </Button>
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-slate-500 text-lg font-medium">Project not found</p>
                        <p className="text-slate-400">The project you're looking for doesn't exist or was archived.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                        <Link href="/projects" className="hover:text-[#3D4A67] flex items-center gap-1">
                            <Briefcase className="h-3 w-3" /> Projects
                        </Link>
                        <span>/</span>
                        <span className="font-medium text-slate-900">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-[#3D4A67]">{project.name}</h1>
                        <Badge className={PROJECT_STATUS_COLORS[project.status]}>
                            {PROJECT_STATUS_LABELS[project.status]}
                        </Badge>
                    </div>
                    {project.description && (
                        <p className="text-slate-600 max-w-2xl">{project.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Edit className="h-4 w-4" /> Edit
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSubmitEdit}>
                                <DialogHeader>
                                    <DialogTitle className="text-[#3D4A67]">Edit Project</DialogTitle>
                                    <DialogDescription>Update project details and metadata.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-name">Project Name *</Label>
                                        <Input
                                            id="edit-name"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-description">Description</Label>
                                        <Input
                                            id="edit-description"
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-client">Client</Label>
                                        <Select value={editClientId} onValueChange={setEditClientId}>
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
                                        <Label htmlFor="edit-deadline">Deadline</Label>
                                        <Input
                                            id="edit-deadline"
                                            type="date"
                                            value={editDeadline}
                                            onChange={(e) => setEditDeadline(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-status">Status</Label>
                                        <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ProjectStatus)}>
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-budget">Budget Amount</Label>
                                            <Input
                                                id="edit-budget"
                                                type="number"
                                                value={editBudgetAmount}
                                                onChange={(e) => setEditBudgetAmount(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-currency">Currency</Label>
                                            <Select value={editBudgetCurrency} onValueChange={setEditBudgetCurrency}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="CHF">CHF</SelectItem>
                                                    <SelectItem value="EUR">EUR</SelectItem>
                                                    <SelectItem value="USD">USD</SelectItem>
                                                    <SelectItem value="GBP">GBP</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-50 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-medium">Recurring Project</Label>
                                                <p className="text-xs text-slate-500">Enable automatic repetition</p>
                                            </div>
                                            <Switch
                                                checked={editIsRecurring}
                                                onCheckedChange={setEditIsRecurring}
                                            />
                                        </div>

                                        {editIsRecurring && (
                                            <div className="grid gap-2">
                                                <Label htmlFor="edit-interval">Recurrence Interval</Label>
                                                <Select
                                                    value={editRecurrenceInterval}
                                                    onValueChange={(v: any) => setEditRecurrenceInterval(v)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="monthly">Monthly</SelectItem>
                                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                                        <SelectItem value="yearly">Yearly</SelectItem>
                                                        <SelectItem value="fixed_interval">Fixed Interval</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Custom Fields Section */}
                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[#3D4A67] font-semibold">Custom Details</Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-[#9EAE8E] hover:text-[#7E8E6E] hover:bg-[#9EAE8E]/10"
                                                onClick={() => setEditCustomFields([...editCustomFields, { id: Date.now().toString(), key: '', value: '' }])}
                                            >
                                                <PlusCircle className="h-3 w-3 mr-1" /> Add Field
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {editCustomFields.map((field, index) => (
                                                <div key={field.id} className="flex gap-2 items-start">
                                                    <Input
                                                        placeholder="Label (e.g. Region)"
                                                        value={field.key}
                                                        onChange={(e) => {
                                                            const newFields = [...editCustomFields]
                                                            newFields[index].key = e.target.value
                                                            setEditCustomFields(newFields)
                                                        }}
                                                        className="h-8 text-xs"
                                                    />
                                                    <Input
                                                        placeholder="Value"
                                                        value={field.value}
                                                        onChange={(e) => {
                                                            const newFields = [...editCustomFields]
                                                            newFields[index].value = e.target.value
                                                            setEditCustomFields(newFields)
                                                        }}
                                                        className="h-8 text-xs"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                                                        onClick={() => setEditCustomFields(editCustomFields.filter(f => f.id !== field.id))}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {editCustomFields.length === 0 && (
                                                <p className="text-[10px] text-slate-400 italic text-center py-2">No custom fields added yet.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmittingEdit}>Cancel</Button>
                                    <Button type="submit" className="bg-[#9EAE8E] hover:bg-[#7E8E6E]" disabled={isSubmittingEdit}>
                                        {isSubmittingEdit ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2 border-slate-200">
                        <Archive className="h-4 w-4" /> Archive
                    </Button>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-slate-100/50 p-1 border border-slate-200 w-full justify-start md:w-auto">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
                    <TabsTrigger value="time">Time</TabsTrigger>
                    <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
                    <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Quick Info & Activity */}
                        <div className="md:col-span-2 space-y-6">
                            <ProjectTimeline projectId={projectId} />

                            <Card className="border-slate-200">
                                <CardHeader>
                                    <CardTitle className="text-lg">Project Details</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-6">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-slate-500 uppercase">Client</p>
                                            <div className="flex items-center gap-2 text-[#3D4A67] font-medium">
                                                <User className="h-4 w-4 text-slate-400" />
                                                {project.clientName || 'No client assigned'}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-slate-500 uppercase">Deadline</p>
                                            <div className="flex items-center gap-2 text-[#3D4A67] font-medium">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                {project.deadline ? format(project.deadline, 'MMMM d, yyyy') : 'No deadline set'}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-slate-500 uppercase">Created On</p>
                                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                <Clock className="h-4 w-4 text-slate-400" />
                                                {format(project.createdAt, 'MMM d, yyyy')}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-slate-500 uppercase">Last Updated</p>
                                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                <CheckCircle2 className="h-4 w-4 text-slate-400" />
                                                {format(project.updatedAt, 'MMM d, yyyy h:mm a')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Custom Fields Display */}
                                    {project.custom_fields && Object.keys(project.custom_fields).length > 0 && (
                                        <div className="pt-6 border-t border-slate-100">
                                            <p className="text-xs font-semibold text-[#3D4A67] uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <PlusCircle className="h-3 w-3" /> Additional Details
                                            </p>
                                            <div className="grid sm:grid-cols-2 gap-y-4 gap-x-8">
                                                {Object.entries(project.custom_fields).map(([key, value]) => (
                                                    <div key={key} className="space-y-1">
                                                        <p className="text-[10px] font-medium text-slate-400 uppercase">{key}</p>
                                                        <p className="text-sm font-medium text-[#3D4A67]">{String(value)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <ActivityTimeline projectId={projectId} />
                        </div>

                        {/* Sidebar Column */}
                        <div className="space-y-6">
                            <Card className="border-slate-200 bg-slate-50/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Stats</CardTitle>
                                    <CardDescription>Quick performance indicators</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-sm font-medium text-slate-500">Tasks</p>
                                            <span className="text-xs font-semibold text-[#3D4A67]">{Math.round(taskProgress)}%</span>
                                        </div>
                                        <Progress value={taskProgress} className="h-2 mb-3" />
                                        <p className="text-2xl font-bold text-[#3D4A67]">{completedTasks} / {totalTasks}</p>
                                        <p className="text-xs text-slate-400 mt-1">Completed / Total</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                                        <p className="text-sm font-medium text-slate-500 mb-1">Invoices</p>
                                        <p className="text-2xl font-bold text-[#3D4A67]">{invoices.length}</p>
                                        <p className="text-xs text-slate-400 mt-1">Total project invoices</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <MilestoneSection projectId={projectId} />

                            <ProjectTeamSection projectId={projectId} />

                            <ProjectBudgetStats
                                projectId={projectId}
                                budgetAmount={project.budget_amount}
                                currency={project.budget_currency}
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="tasks" className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-[#3D4A67]">Project Tasks</h3>
                        {project && (
                            <AddTaskDialog
                                projectId={projectId}
                                contactId={project.clientId || undefined}
                                buttonClassName="bg-[#9EAE8E] hover:bg-[#7E8E6E] gap-2"
                            />
                        )}
                    </div>
                    {tasks.length === 0 ? (
                        <Card className="border-dashed border-2">
                            <CardContent className="py-12 text-center text-slate-500">
                                <p className="mb-4">No tasks assigned to this project yet.</p>
                                {project && (
                                    <AddTaskDialog
                                        projectId={projectId}
                                        contactId={project.clientId || undefined}
                                        buttonVariant="outline"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-3">
                            {tasks.map(task => {
                                const isBlocked = task.dependencies?.some(depId => {
                                    const depTask = tasks.find(t => t.id === depId)
                                    return depTask && depTask.status !== 'done'
                                })

                                return (
                                    <Card key={task.id} className={`border-slate-200 shadow-sm transition-all ${isBlocked ? 'opacity-70 bg-slate-50' : 'hover:border-slate-300'}`}>
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {isBlocked ? (
                                                    <div className="h-5 w-5 flex items-center justify-center text-slate-400">
                                                        <Lock className="h-4 w-4" />
                                                    </div>
                                                ) : (
                                                    <Checkbox
                                                        checked={task.status === 'done'}
                                                        onCheckedChange={(checked) => {
                                                            updateStatus(task.id, checked ? 'done' : 'todo')
                                                        }}
                                                    />
                                                )}
                                                <div>
                                                    <p className={`font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-[#3D4A67]'}`}>
                                                        {task.title}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {task.dueDate && (
                                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                                            </p>
                                                        )}
                                                        {isBlocked && (
                                                            <div className="flex flex-wrap gap-1">
                                                                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter bg-amber-50 px-1 border border-amber-100 rounded">
                                                                    Blocked by:
                                                                </span>
                                                                {task.dependencies?.map(depId => {
                                                                    const depTask = tasks.find(t => t.id === depId)
                                                                    if (depTask && depTask.status !== 'done') {
                                                                        return (
                                                                            <span key={depId} className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded truncate max-w-[100px]">
                                                                                {depTask.title}
                                                                            </span>
                                                                        )
                                                                    }
                                                                    return null
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={`capitalize ${TASK_PRIORITY_COLORS[task.priority]}`}>
                                                {task.priority}
                                            </Badge>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="time" className="mt-6">
                    <ProjectTimeTab projectId={projectId} />
                </TabsContent>

                <TabsContent value="documents" className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-[#3D4A67]">Documents</h3>
                        {project && (
                            <UploadDocumentDialog
                                projectId={projectId}
                                contactId={project.clientId || undefined}
                            />
                        )}
                    </div>
                    {documents.length === 0 ? (
                        <Card className="border-dashed border-2">
                            <CardContent className="py-12 text-center text-slate-500">
                                <p className="mb-4">No documents uploaded for this project.</p>
                                {project && (
                                    <UploadDocumentDialog
                                        projectId={projectId}
                                        contactId={project.clientId || undefined}
                                        buttonVariant="outline"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {documents.map(doc => (
                                <Card key={doc.id} className="border-slate-200 shadow-sm group">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-50 rounded-lg">
                                                <FileIcon className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-[#3D4A67] truncate" title={doc.name}>
                                                    {doc.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {(doc.sizeBytes ? doc.sizeBytes / 1024 : 0).toFixed(1)} KB • {format(doc.createdAt, 'MMM d')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="invoices" className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-[#3D4A67]">Project Invoices</h3>
                        <CreateInvoiceDialog
                            projectId={projectId}
                            contactId={project.clientId || null}
                        />
                    </div>
                    {invoices.length === 0 ? (
                        <Card className="border-dashed border-2">
                            <CardContent className="py-12 text-center text-slate-500">
                                <p className="mb-4">No invoices found for this project.</p>
                                {project && (
                                    <CreateInvoiceDialog
                                        projectId={projectId}
                                        contactId={project.clientId || null}
                                        buttonVariant="outline"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr>
                                        <th className="px-4 py-3">Number</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map(invoice => (
                                        <tr key={invoice.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-[#3D4A67]">{invoice.invoice_number}</td>
                                            <td className="px-4 py-3 text-slate-500">
                                                {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM d, yyyy') : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                {invoice.currency} {invoice.amount_total.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge className="capitalize">
                                                    {invoice.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
