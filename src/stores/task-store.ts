import { create } from 'zustand'
import { Task, CreateTaskInput, TaskStatus } from '@/types/task'
import { createClient } from '@/lib/supabase/client'

interface TaskStore {
    tasks: Task[]
    isLoading: boolean
    error: string | null

    // Actions
    fetchTasks: (projectId?: string) => Promise<void>
    fetchTaskById: (id: string) => Promise<void>
    addTask: (input: CreateTaskInput) => Promise<Task | null>
    updateTask: (id: string, updates: Partial<Task>) => Promise<void>
    deleteTask: (id: string) => Promise<boolean>
    updateStatus: (id: string, status: TaskStatus) => Promise<void>
    // Subtasks are client-side only (requires task_subtasks DB migration to persist)
    addSubtask: (taskId: string, title: string) => void
    toggleSubtask: (taskId: string, subtaskId: string) => void
    removeSubtask: (taskId: string, subtaskId: string) => void
    getTask: (id: string) => Task | undefined
}

function errMsg(e: unknown): string {
    return e instanceof Error ? e.message : 'Unknown error'
}

// Convert DB row to Task — computes isOverdue client-side
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToTask(row: any): Task {
    const today = new Date().toISOString().split('T')[0]
    const status: TaskStatus = row.status || 'todo'

    return {
        id: row.id,
        title: row.title,
        description: row.description,
        status,
        priority: row.priority || 'medium',
        dueDate: row.due_date ? new Date(row.due_date) : undefined,
        isOverdue: status !== 'done' && !!row.due_date && row.due_date < today,
        projectId: row.project_id,
        contactId: row.contact_id,
        milestone_id: row.milestone_id,
        dependencies: row.task_dependencies?.map((d: { depends_on_task_id: string }) => d.depends_on_task_id) || [],
        subtasks: [], // Client-side only — persisting requires task_subtasks table
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    }
}

const TASK_SELECT = `
    *,
    task_dependencies!task_id (
        depends_on_task_id
    )
`

export const useTaskStore = create<TaskStore>()((set, get) => ({
    tasks: [],
    isLoading: false,
    error: null,

    fetchTasks: async (projectId) => {
        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()
            // Default sort: priority desc (urgent first), then created_at desc
            let query = supabase
                .from('tasks')
                .select(TASK_SELECT)
                .order('created_at', { ascending: false })

            if (projectId) {
                query = query.eq('project_id', projectId)
            }

            const { data, error } = await query
            if (error) throw error

            set({ tasks: (data || []).map(dbToTask), isLoading: false })
        } catch (error: unknown) {
            console.error('Error fetching tasks:', error)
            set({ error: errMsg(error), isLoading: false })
        }
    },

    fetchTaskById: async (id) => {
        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('tasks')
                .select(TASK_SELECT)
                .eq('id', id)
                .single()

            if (error) {
                if (error.code === 'PGRST116') throw new Error('TASK_NOT_FOUND')
                throw error
            }

            const task = dbToTask(data)
            set((state) => {
                const exists = state.tasks.some(t => t.id === id)
                return {
                    tasks: exists
                        ? state.tasks.map(t => (t.id === id ? task : t))
                        : [...state.tasks, task],
                    isLoading: false,
                }
            })
        } catch (error: unknown) {
            console.error('Error fetching task:', error)
            set({ error: errMsg(error), isLoading: false })
        }
    },

    addTask: async (input) => {
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

            const dbData = {
                tenant_id: profile.tenant_id,
                created_by: user.id,
                title: input.title,
                description: input.description || null,
                status: input.status || 'todo',
                priority: input.priority || 'medium',
                due_date: input.dueDate?.toISOString().split('T')[0] || null,
                project_id: input.projectId || null,
                contact_id: input.contactId || null,
                milestone_id: input.milestone_id || null,
            }

            const { data, error } = await supabase
                .from('tasks')
                .insert(dbData)
                .select()
                .single()

            if (error) throw error

            const newTask = dbToTask(data)

            // Add dependencies atomically — rollback task if insert fails
            if (input.dependencyIds && input.dependencyIds.length > 0) {
                const depData = input.dependencyIds.map(depId => ({
                    task_id: newTask.id,
                    depends_on_task_id: depId,
                    tenant_id: profile.tenant_id,
                }))
                const { error: depError } = await supabase
                    .from('task_dependencies')
                    .insert(depData)
                if (depError) {
                    // Rollback: delete task we just created
                    await supabase.from('tasks').delete().eq('id', newTask.id)
                    throw depError
                }
                newTask.dependencies = input.dependencyIds
            }

            set((state) => ({ tasks: [newTask, ...state.tasks] }))
            return newTask
        } catch (error: unknown) {
            console.error('Error adding task:', error)
            set({ error: errMsg(error) })
            return null
        }
    },

    updateTask: async (id, updates) => {
        set({ error: null })
        try {
            const supabase = createClient()

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dbUpdates: any = { updated_at: new Date().toISOString() }

            if (updates.title       !== undefined) dbUpdates.title        = updates.title
            if (updates.description !== undefined) dbUpdates.description  = updates.description
            if (updates.status      !== undefined) dbUpdates.status       = updates.status
            if (updates.priority    !== undefined) dbUpdates.priority     = updates.priority
            if (updates.dueDate     !== undefined) dbUpdates.due_date     = updates.dueDate?.toISOString().split('T')[0] || null
            if (updates.projectId   !== undefined) dbUpdates.project_id   = updates.projectId
            if (updates.contactId   !== undefined) dbUpdates.contact_id   = updates.contactId
            if (updates.milestone_id !== undefined) dbUpdates.milestone_id = updates.milestone_id

            const { error } = await supabase
                .from('tasks')
                .update(dbUpdates)
                .eq('id', id)

            if (error) throw error

            // Handle dependency updates atomically — snapshot, delete, re-add, rollback on failure
            if (updates.dependencies !== undefined) {
                const oldTask   = get().tasks.find(t => t.id === id)
                const oldDeps   = oldTask?.dependencies ?? []

                await supabase.from('task_dependencies').delete().eq('task_id', id)

                if (updates.dependencies.length > 0) {
                    const { data: { user } } = await supabase.auth.getUser()
                    const { data: profile }  = await supabase
                        .from('profiles')
                        .select('tenant_id')
                        .eq('id', user?.id)
                        .single()

                    const depData = updates.dependencies.map(depId => ({
                        task_id: id,
                        depends_on_task_id: depId,
                        tenant_id: profile?.tenant_id,
                    }))
                    const { error: depError } = await supabase
                        .from('task_dependencies')
                        .insert(depData)

                    if (depError) {
                        // Rollback: re-insert old deps
                        if (oldDeps.length > 0) {
                            const rollback = oldDeps.map(depId => ({
                                task_id: id,
                                depends_on_task_id: depId,
                                tenant_id: profile?.tenant_id,
                            }))
                            await supabase.from('task_dependencies').insert(rollback)
                        }
                        throw depError
                    }
                }
            }

            // Re-compute isOverdue after status/dueDate change
            const today = new Date().toISOString().split('T')[0]
            set((state) => ({
                tasks: state.tasks.map((t) => {
                    if (t.id !== id) return t
                    const merged = { ...t, ...updates, updatedAt: new Date() }
                    const dueDateStr = merged.dueDate?.toISOString().split('T')[0]
                    merged.isOverdue = merged.status !== 'done' && !!dueDateStr && dueDateStr < today
                    return merged
                }),
            }))
        } catch (error: unknown) {
            console.error('Error updating task:', error)
            set({ error: errMsg(error) })
        }
    },

    deleteTask: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase.from('tasks').delete().eq('id', id)
            if (error) throw error
            set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }))
            return true
        } catch (error: unknown) {
            console.error('Error deleting task:', error)
            set({ error: errMsg(error) })
            return false
        }
    },

    updateStatus: async (id, status) => {
        // Validate dependency blocking — task can't move forward if blocking tasks are incomplete
        const store = get()
        const task = store.tasks.find(t => t.id === id)
        if (task && (status === 'in_progress' || status === 'done')) {
            const blockers = (task.dependencies ?? []).filter(depId => {
                const dep = store.tasks.find(t => t.id === depId)
                return dep && dep.status !== 'done'
            })
            if (blockers.length > 0) {
                const depTitles = blockers
                    .map(id => store.tasks.find(t => t.id === id)?.title || id)
                    .join(', ')
                set({ error: `Cannot advance: blocked by "${depTitles}"` })
                return
            }
        }
        await get().updateTask(id, { status })
    },

    // ── Subtask management (client-side only) ─────────────────────────────────

    addSubtask: (taskId, title) => {
        set((state) => ({
            tasks: state.tasks.map((t) =>
                t.id === taskId
                    ? {
                          ...t,
                          subtasks: [
                              ...t.subtasks,
                              {
                                  id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                                  title,
                                  completed: false,
                              },
                          ],
                          updatedAt: new Date(),
                      }
                    : t
            ),
        }))
    },

    toggleSubtask: (taskId, subtaskId) => {
        set((state) => ({
            tasks: state.tasks.map((t) =>
                t.id === taskId
                    ? {
                          ...t,
                          subtasks: t.subtasks.map((s) =>
                              s.id === subtaskId ? { ...s, completed: !s.completed } : s
                          ),
                          updatedAt: new Date(),
                      }
                    : t
            ),
        }))
    },

    removeSubtask: (taskId, subtaskId) => {
        set((state) => ({
            tasks: state.tasks.map((t) =>
                t.id === taskId
                    ? {
                          ...t,
                          subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
                          updatedAt: new Date(),
                      }
                    : t
            ),
        }))
    },

    getTask: (id) => get().tasks.find((t) => t.id === id),
}))
