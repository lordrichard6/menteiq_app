'use client'

import { Project, ProjectStatus, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types/project'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DeadlineBadge } from '@/components/projects/deadline-badge'
import { Progress } from '@/components/ui/progress'
import { Calendar, User, MoreHorizontal, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ProjectKanbanBoardProps {
    projects: Project[]
    onStatusChange: (id: string, status: ProjectStatus) => Promise<void>
}

const COLUMNS: ProjectStatus[] = ['lead', 'active', 'on_hold', 'completed']

export function ProjectKanbanBoard({ projects, onStatusChange }: ProjectKanbanBoardProps) {
    // Group projects by status
    const groupedProjects = COLUMNS.reduce((acc, status) => {
        acc[status] = projects.filter(p => p.status === status)
        return acc
    }, {} as Record<ProjectStatus, Project[]>)

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full overflow-x-auto pb-4">
            {COLUMNS.map(status => (
                <div key={status} className="flex flex-col min-w-[300px] bg-slate-50/50 rounded-xl border border-slate-200/60 p-4">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[#3D4A67] capitalize">
                                {PROJECT_STATUS_LABELS[status]}
                            </h3>
                            <Badge variant="secondary" className="bg-slate-200 text-[#3D4A67] hover:bg-slate-200">
                                {groupedProjects[status].length}
                            </Badge>
                        </div>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto min-h-[200px]">
                        {groupedProjects[status].length === 0 ? (
                            <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                                No projects
                            </div>
                        ) : (
                            groupedProjects[status].map(project => (
                                <ProjectKanbanCard
                                    key={project.id}
                                    project={project}
                                    onStatusChange={(s) => onStatusChange(project.id, s)}
                                />
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

function ProjectKanbanCard({
    project,
    onStatusChange
}: {
    project: Project,
    onStatusChange: (s: ProjectStatus) => void
}) {
    // For now, we take 0 as default if we don't have task counts in the project object itself
    // In a real scenario, we might want to extend the Project type or pass progress separately
    const progress = 0

    return (
        <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            {/* Status accent top border */}
            <div className={`absolute top-0 left-0 w-full h-1 ${PROJECT_STATUS_COLORS[project.status].split(' ')[0]}`} />

            <CardHeader className="p-4 pb-2 space-y-0">
                <div className="flex justify-between items-start gap-2">
                    <Link href={`/projects/${project.id}`} className="group-hover:text-[#9EAE8E] transition-colors">
                        <CardTitle className="text-sm font-bold text-[#3D4A67] line-clamp-2 leading-tight">
                            {project.name}
                        </CardTitle>
                    </Link>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50 pointer-events-none">
                                Move to
                            </DropdownMenuItem>
                            {COLUMNS.filter(s => s !== project.status).map(status => (
                                <DropdownMenuItem
                                    key={status}
                                    onClick={() => onStatusChange(status)}
                                    className="capitalize"
                                >
                                    {PROJECT_STATUS_LABELS[status]}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent className="p-4 pt-0 space-y-3">
                <div className="space-y-2">
                    {project.clientName && (
                        <div className="flex items-center text-[12px] text-slate-500">
                            <User className="h-3 w-3 mr-1.5 opacity-60" />
                            <span className="truncate">{project.clientName}</span>
                        </div>
                    )}
                    {project.deadline && (
                        <div className="flex items-center text-[12px] text-slate-500">
                            <DeadlineBadge deadline={project.deadline} className="h-6 text-[10px]" />
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t border-slate-50">
                    <div className="flex justify-between items-center text-[11px] mb-1.5">
                        <span className="text-slate-400 font-medium tracking-tight">PROGRESS</span>
                        <span className="text-[#3D4A67] font-bold">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-slate-100" />
                </div>

                <div className="flex justify-end pt-1">
                    <Link href={`/projects/${project.id}`} className="text-[11px] font-bold text-[#9EAE8E] flex items-center gap-1 hover:gap-2 transition-all">
                        DETAILS <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
