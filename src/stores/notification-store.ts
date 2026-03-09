import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export type NotificationType =
    | 'task_due'
    | 'task_overdue'
    | 'invoice_due'
    | 'invoice_overdue'
    | 'mention'
    | 'comment'
    | 'assignment'
    | 'status_change'
    | 'reminder'
    | 'system'
    | 'welcome'
    | 'update'

export interface Notification {
    id: string
    type: NotificationType
    title: string
    message?: string
    entityType?: string
    entityId?: string
    entityUrl?: string
    read: boolean
    archived: boolean
    metadata?: Record<string, unknown>
    createdAt: Date
    readAt?: Date
}

interface NotificationStore {
    notifications: Notification[]
    unreadCount: number
    isLoading: boolean
    error: string | null

    // Actions
    fetchNotifications: () => Promise<void>
    markAsRead: (id: string) => Promise<void>
    markAllAsRead: () => Promise<void>
    archiveNotification: (id: string) => Promise<void>
    clearAll: () => Promise<void>
    getUnreadCount: () => Promise<void>
}

// Convert DB row to Notification
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToNotification(row: any): Notification {
    return {
        id: row.id,
        type: row.type,
        title: row.title,
        message: row.message,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entityUrl: row.entity_url,
        read: row.read,
        archived: row.archived,
        metadata: row.metadata || {},
        createdAt: new Date(row.created_at),
        readAt: row.read_at ? new Date(row.read_at) : undefined,
    }
}

export const useNotificationStore = create<NotificationStore>()((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,

    fetchNotifications: async () => {
        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                set({ isLoading: false })
                return
            }

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .eq('archived', false)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error

            const notifications = (data || []).map(dbToNotification)
            const unreadCount = notifications.filter((n) => !n.read).length

            set({ notifications, unreadCount, isLoading: false })
        } catch (error: unknown) {
            console.error('Error fetching notifications:', error)
            set({ error: error instanceof Error ? error.message : String(error), isLoading: false })
        }
    },

    markAsRead: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('notifications')
                .update({ read: true, read_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, read: true, readAt: new Date() } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }))
        } catch (error: unknown) {
            console.error('Error marking notification as read:', error)
            set({ error: error instanceof Error ? error.message : String(error) })
        }
    },

    markAllAsRead: async () => {
        set({ error: null })
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error } = await supabase
                .from('notifications')
                .update({ read: true, read_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('read', false)

            if (error) throw error

            set((state) => ({
                notifications: state.notifications.map((n) => ({
                    ...n,
                    read: true,
                    readAt: new Date(),
                })),
                unreadCount: 0,
            }))
        } catch (error: unknown) {
            console.error('Error marking all notifications as read:', error)
            set({ error: error instanceof Error ? error.message : String(error) })
        }
    },

    archiveNotification: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('notifications')
                .update({ archived: true })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                notifications: state.notifications.filter((n) => n.id !== id),
                unreadCount: state.notifications.find((n) => n.id === id)?.read
                    ? state.unreadCount
                    : Math.max(0, state.unreadCount - 1),
            }))
        } catch (error: unknown) {
            console.error('Error archiving notification:', error)
            set({ error: error instanceof Error ? error.message : String(error) })
        }
    },

    clearAll: async () => {
        set({ error: null })
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error } = await supabase
                .from('notifications')
                .update({ archived: true })
                .eq('user_id', user.id)
                .eq('archived', false)

            if (error) throw error

            set({ notifications: [], unreadCount: 0 })
        } catch (error: unknown) {
            console.error('Error clearing notifications:', error)
            set({ error: error instanceof Error ? error.message : String(error) })
        }
    },

    getUnreadCount: async () => {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('read', false)
                .eq('archived', false)

            if (error) throw error

            set({ unreadCount: count || 0 })
        } catch (error: unknown) {
            console.error('Error getting unread count:', error)
        }
    },
}))
