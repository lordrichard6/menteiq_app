import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry, CreateTimeEntryInput } from '@/types/time'

interface TimeStore {
    timeEntries: TimeEntry[]
    isLoading: boolean
    error: string | null

    // Actions
    fetchTimeEntries: (projectId: string) => Promise<void>
    addTimeEntry: (input: CreateTimeEntryInput) => Promise<TimeEntry | null>
    deleteTimeEntry: (id: string) => Promise<void>
}

export const useTimeStore = create<TimeStore>()((set, get) => ({
    timeEntries: [],
    isLoading: false,
    error: null,

    fetchTimeEntries: async (projectId) => {
        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('time_entries')
                .select(`
                    *,
                    user:profiles (
                        first_name,
                        last_name
                    )
                `)
                .eq('project_id', projectId)
                .order('date', { ascending: false })

            if (error) throw error
            set({ timeEntries: data as TimeEntry[], isLoading: false })
        } catch (error: any) {
            console.error('Error fetching time entries:', error)
            set({ error: error.message, isLoading: false })
        }
    },

    addTimeEntry: async (input) => {
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
                .from('time_entries')
                .insert({
                    ...input,
                    tenant_id: profile.tenant_id,
                    user_id: user.id
                })
                .select(`
                    *,
                    user:profiles (
                        first_name,
                        last_name
                    )
                `)
                .single()

            if (error) throw error

            const newEntry = data as TimeEntry
            set((state) => ({
                timeEntries: [newEntry, ...state.timeEntries]
            }))
            return newEntry
        } catch (error: any) {
            console.error('Error adding time entry:', error)
            set({ error: error.message })
            return null
        }
    },

    deleteTimeEntry: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('time_entries')
                .delete()
                .eq('id', id)

            if (error) throw error
            set((state) => ({
                timeEntries: state.timeEntries.filter((e) => e.id !== id)
            }))
        } catch (error: any) {
            console.error('Error deleting time entry:', error)
            set({ error: error.message })
        }
    }
}))
