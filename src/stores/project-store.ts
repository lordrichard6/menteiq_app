import { create } from 'zustand'
import { Project, CreateProjectInput, ProjectStatus, ProjectFilters, ProjectSort } from '@/types/project'
import { createClient } from '@/lib/supabase/client'

interface ProjectStore {
    projects: Project[]
    isLoading: boolean
    error: string | null
    currentPage: number
    pageSize: number
    totalCount: number
    filters: ProjectFilters
    sortConfig: ProjectSort

    // Actions
    fetchProjects: () => Promise<void>
    setFilters: (filters: Partial<ProjectFilters>) => void
    setSort: (column: ProjectSort['column']) => void
    setPage: (page: number) => void
    setPageSize: (size: number) => void
    addProject: (input: CreateProjectInput) => Promise<Project | null>
    updateProject: (id: string, updates: Partial<Project>) => Promise<void>
    deleteProject: (id: string) => Promise<void>
    archiveProject: (id: string) => Promise<void>
    restoreProject: (id: string) => Promise<void>
    getProject: (id: string) => Project | undefined
}


// Convert DB row to Project
function dbToProject(row: any): Project {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        clientId: row.contact_id,
        clientName: row.contacts?.company_name ||
            [row.contacts?.first_name, row.contacts?.last_name].filter(Boolean).join(' '),
        status: row.status as ProjectStatus,
        deadline: row.deadline ? new Date(row.deadline) : undefined,
        budget_amount: row.budget_amount,
        budget_currency: row.budget_currency,
        is_recurring: row.is_recurring,
        recurrence_interval: row.recurrence_interval,
        next_occurrence_date: row.next_occurrence_date ? new Date(row.next_occurrence_date) : undefined,
        archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
        custom_fields: row.custom_fields || {},
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    }
}

export const useProjectStore = create<ProjectStore>()((set, get) => ({
    projects: [],
    isLoading: false,
    error: null,
    currentPage: 1,
    pageSize: 12,
    totalCount: 0,
    filters: {
        search: '',
        status: 'all',
        clientId: 'all',
    },
    sortConfig: {
        column: 'created_at',
        direction: 'desc',
    },

    fetchProjects: async () => {
        set({ isLoading: true, error: null })
        try {
            const { filters, sortConfig, currentPage, pageSize } = get()
            const supabase = createClient()

            let query = supabase
                .from('projects')
                .select(`
                    *,
                    contacts (
                        first_name,
                        last_name,
                        company_name
                    )
                `, { count: 'exact' })

            // Apply filters
            query = query.is('archived_at', null)

            if (filters.search) {
                query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
            }

            if (filters.status !== 'all') {
                query = query.eq('status', filters.status)
            }

            if (filters.clientId !== 'all') {
                query = query.eq('contact_id', filters.clientId)
            }

            // Apply sorting
            query = query.order(sortConfig.column, { ascending: sortConfig.direction === 'asc' })

            // Apply pagination
            const from = (currentPage - 1) * pageSize
            const to = from + pageSize - 1
            query = query.range(from, to)

            const { data, error, count } = await query

            if (error) throw error

            const projects = (data || []).map(dbToProject)
            set({ projects, totalCount: count || 0, isLoading: false })
        } catch (error: any) {
            console.error('Error fetching projects:', error)
            set({ error: error.message, isLoading: false })
        }
    },

    setFilters: (newFilters) => {
        set((state) => ({
            filters: { ...state.filters, ...newFilters },
            currentPage: 1, // Reset to first page on filter change
        }))
        get().fetchProjects()
    },

    setSort: (column) => {
        set((state) => ({
            sortConfig: {
                column,
                direction:
                    state.sortConfig.column === column && state.sortConfig.direction === 'desc'
                        ? 'asc'
                        : 'desc',
            },
            currentPage: 1,
        }))
        get().fetchProjects()
    },

    setPage: (page) => {
        set({ currentPage: page })
        get().fetchProjects()
    },

    setPageSize: (size) => {
        set({ pageSize: size, currentPage: 1 })
        get().fetchProjects()
    },

    addProject: async (input) => {
        set({ error: null })
        try {
            const supabase = createClient()

            // Get current user's tenant_id
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

            if (!profile?.tenant_id) throw new Error('No organization found')

            const dbData = {
                tenant_id: profile.tenant_id,
                name: input.name,
                description: input.description || null,
                contact_id: input.clientId || null,
                status: input.status || 'lead',
                deadline: input.deadline?.toISOString() || null,
                budget_amount: input.budget_amount || 0,
                budget_currency: input.budget_currency || 'CHF',
                is_recurring: input.is_recurring || false,
                recurrence_interval: input.recurrence_interval || null,
                next_occurrence_date: input.next_occurrence_date?.toISOString() || null,
                custom_fields: input.custom_fields || {},
            }

            const { data, error } = await supabase
                .from('projects')
                .insert(dbData)
                .select(`
                    *,
                    contacts (
                        first_name,
                        last_name,
                        company_name
                    )
                `)
                .single()

            if (error) throw error

            const newProject = dbToProject(data)
            set((state) => ({ projects: [newProject, ...state.projects] }))
            return newProject
        } catch (error: any) {
            console.error('Error adding project:', error)
            set({ error: error.message })
            return null
        }
    },

    updateProject: async (id, updates) => {
        set({ error: null })
        try {
            const supabase = createClient()

            const dbUpdates: any = { updated_at: new Date().toISOString() }

            if (updates.name !== undefined) dbUpdates.name = updates.name
            if (updates.description !== undefined) dbUpdates.description = updates.description
            if (updates.clientId !== undefined) dbUpdates.contact_id = updates.clientId
            if (updates.status !== undefined) dbUpdates.status = updates.status
            if (updates.deadline !== undefined) {
                dbUpdates.deadline = updates.deadline?.toISOString() || null
            }
            if (updates.budget_amount !== undefined) dbUpdates.budget_amount = updates.budget_amount
            if (updates.budget_currency !== undefined) dbUpdates.budget_currency = updates.budget_currency
            if (updates.is_recurring !== undefined) dbUpdates.is_recurring = updates.is_recurring
            if (updates.recurrence_interval !== undefined) dbUpdates.recurrence_interval = updates.recurrence_interval
            if (updates.next_occurrence_date !== undefined) {
                dbUpdates.next_occurrence_date = updates.next_occurrence_date?.toISOString() || null
            }
            if (updates.custom_fields !== undefined) dbUpdates.custom_fields = updates.custom_fields

            const { error } = await supabase
                .from('projects')
                .update(dbUpdates)
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                projects: state.projects.map((p) =>
                    p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
                ),
            }))
        } catch (error: any) {
            console.error('Error updating project:', error)
            set({ error: error.message })
        }
    },

    deleteProject: async (id) => {
        await get().archiveProject(id)
    },

    archiveProject: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('projects')
                .update({
                    archived_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                projects: state.projects.filter((p) => p.id !== id),
            }))
        } catch (error: any) {
            console.error('Error archiving project:', error)
            set({ error: error.message })
        }
    },

    restoreProject: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('projects')
                .update({
                    archived_at: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error

            // Refresh projects to show the restored one
            await get().fetchProjects()
        } catch (error: any) {
            console.error('Error restoring project:', error)
            set({ error: error.message })
        }
    },

    getProject: (id) => {
        return get().projects.find((p) => p.id === id)
    },
}))
