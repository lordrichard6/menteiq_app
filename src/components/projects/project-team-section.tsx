'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserPlus, MoreVertical, X, Loader2, Check } from 'lucide-react'
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

interface Profile {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    email?: string
}

interface ProjectMember {
    id: string
    user_id: string
    role: 'manager' | 'contributor' | 'viewer'
    profiles: Profile
}

interface ProjectTeamSectionProps {
    projectId: string
}

export function ProjectTeamSection({ projectId }: ProjectTeamSectionProps) {
    const [members, setMembers] = useState<ProjectMember[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [availableUsers, setAvailableUsers] = useState<Profile[]>([])
    const [selectedUserId, setSelectedUserId] = useState<string>('')
    const [selectedRole, setSelectedRole] = useState<'manager' | 'contributor' | 'viewer'>('contributor')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const fetchMembers = useCallback(async () => {
        setIsLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('project_members')
            .select(`
                id,
                user_id,
                role,
                profiles (
                    id,
                    first_name,
                    last_name,
                    avatar_url
                )
            `)
            .eq('project_id', projectId)

        if (!error && data) {
            setMembers(data as any)
        }
        setIsLoading(false)
    }, [projectId])

    const fetchAvailableUsers = async () => {
        const supabase = createClient()
        // Get current tenant_id
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        if (!profile) return

        // Get all users in the same tenant who are NOT already members
        const currentMemberIds = members.map(m => m.user_id)

        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url')
            .eq('tenant_id', profile.tenant_id)
            .not('id', 'in', `(${currentMemberIds.join(',') || '00000000-0000-0000-0000-000000000000'})`)

        if (!error && users) {
            setAvailableUsers(users)
        }
    }

    useEffect(() => {
        fetchMembers()
    }, [fetchMembers])

    const handleAddMember = async () => {
        if (!selectedUserId) return
        setIsSubmitting(true)
        const supabase = createClient()
        const { error } = await supabase
            .from('project_members')
            .insert({
                project_id: projectId,
                user_id: selectedUserId,
                role: selectedRole
            })

        if (!error) {
            await fetchMembers()
            setIsAdding(false)
            setSelectedUserId('')
        }
        setIsSubmitting(false)
    }

    const handleRemoveMember = async (memberId: string) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('project_members')
            .delete()
            .eq('id', memberId)

        if (!error) {
            setMembers(members.filter(m => m.id !== memberId))
        }
    }

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-sm font-bold text-[#3D4A67]">Team Members</CardTitle>
                    <CardDescription className="text-[11px]">Collaborators assigned to project</CardDescription>
                </div>
                <Dialog open={isAdding} onOpenChange={(open) => {
                    setIsAdding(open)
                    if (open) fetchAvailableUsers()
                }}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#9EAE8E] hover:text-[#7E8E6E] hover:bg-slate-50">
                            <UserPlus className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Team Member</DialogTitle>
                            <DialogDescription>Assign a colleague to work on this project.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Colleague</label>
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select user..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableUsers.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-slate-500">No other team members available</div>
                                        ) : (
                                            availableUsers.map(user => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    {user.first_name} {user.last_name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Assign Role</label>
                                <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="contributor">Contributor</SelectItem>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                            <Button
                                className="bg-[#9EAE8E] hover:bg-[#7E8E6E]"
                                onClick={handleAddMember}
                                disabled={!selectedUserId || isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                Add Member
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                    </div>
                ) : members.length === 0 ? (
                    <div className="p-6 text-center">
                        <p className="text-sm text-slate-400">No team members assigned</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {members.map(member => (
                            <div key={member.id} className="p-3 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-2.5">
                                    <Avatar className="h-8 w-8 border border-slate-100">
                                        <AvatarImage src={member.profiles.avatar_url || ''} />
                                        <AvatarFallback className="bg-slate-100 text-[#3D4A67] text-[10px] font-bold">
                                            {(member.profiles.first_name?.[0] || '') + (member.profiles.last_name?.[0] || '')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[#3D4A67] truncate">
                                            {member.profiles.first_name} {member.profiles.last_name}
                                        </p>
                                        <Badge variant="outline" className="h-4 text-[9px] uppercase tracking-wider px-1 text-slate-400 border-slate-100">
                                            {member.role}
                                        </Badge>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-all"
                                    onClick={() => handleRemoveMember(member.id)}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
