import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { Milestone, CreateMilestoneInput, UpdateMilestoneInput } from '@/types/milestone'

interface MilestoneStore {
    milestones: Milestone[]
    isLoading: boolean
    error: string | null

    // Actions
    fetchMilestones: (projectId: string) => Promise<void>
    addMilestone: (input: CreateMilestoneInput) => Promise<Milestone | null>
    updateMilestone: (id: string, input: UpdateMilestoneInput) => Promise<void>
    deleteMilestone: (id: string) => Promise<void>
    reorderMilestones: (milestoneIds: string[]) => Promise<void>
}

export const useMilestoneStore = create<MilestoneStore>()((set, get) => ({
    milestones: [],
    isLoading: false,
    error: null,

    fetchMilestones: async (projectId) => {
        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('project_milestones')
                .select('*')
                .eq('project_id', projectId)
                .order('order_index', { ascending: true })

            if (error) throw error
            set({ milestones: data as Milestone[], isLoading: false })
        } catch (error: any) {
            console.error('Error fetching milestones:', error)
            set({ error: error.message, isLoading: false })
        }
    },

    addMilestone: async (input) => {
        set({ error: null })
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

            if (!profile?.tenant_id) throw new Error('No organization found')

            const { data, error } = await supabase
                .from('project_milestones')
                .insert({
                    ...input,
                    tenant_id: profile.tenant_id
                })
                .select()
                .single()

            if (error) throw error

            const newMilestone = data as Milestone
            set((state) => ({
                milestones: [...state.milestones, newMilestone].sort((a, b) => a.order_index - b.order_index)
            }))
            return newMilestone
        } catch (error: any) {
            console.error('Error adding milestone:', error)
            set({ error: error.message })
            return null
        }
    },

    updateMilestone: async (id, input) => {
        set({ error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('project_milestones')
                .update(input)
                .eq('id', id)

            if (error) throw error
            set((state) => ({
                milestones: state.milestones.map((m) => m.id === id ? { ...m, ...input } : m)
                    .sort((a, b) => a.order_index - b.order_index)
            }))
        } catch (error: any) {
            console.error('Error updating milestone:', error)
            set({ error: error.message })
        }
    },

    deleteMilestone: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('project_milestones')
                .delete()
                .eq('id', id)

            if (error) throw error
            set((state) => ({
                milestones: state.milestones.filter((m) => m.id !== id)
            }))
        } catch (error: any) {
            console.error('Error deleting milestone:', error)
            set({ error: error.message })
        }
    },

    reorderMilestones: async (milestoneIds) => {
        try {
            const supabase = createClient()
            const updates = milestoneIds.map((id, index) => ({
                id,
                order_index: index
            }))

            const { error } = await supabase
                .from('project_milestones')
                .upsert(updates)

            if (error) throw error

            set((state) => ({
                milestones: state.milestones.map(m => {
                    const newIndex = milestoneIds.indexOf(m.id)
                    return newIndex !== -1 ? { ...m, order_index: newIndex } : m
                }).sort((a, b) => a.order_index - b.order_index)
            }))
        } catch (error: any) {
            console.error('Error reordering milestones:', error)
            set({ error: error.message })
        }
    }
}))
