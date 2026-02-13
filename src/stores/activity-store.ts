import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { ActivityLog } from '@/types/activity'

interface ActivityStore {
    activities: ActivityLog[]
    isLoading: boolean
    error: string | null

    // Actions
    fetchActivities: (filters: { entityId?: string; entityType?: string }) => Promise<void>
}

function dbToActivity(row: any): ActivityLog {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        eventType: row.event_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entityName: row.entity_name,
        description: row.description,
        metadata: row.metadata || {},
        createdAt: new Date(row.created_at),
        userName: row.user_name,
        userAvatar: row.user_avatar
    }
}

export const useActivityStore = create<ActivityStore>()((set) => ({
    activities: [],
    isLoading: false,
    error: null,

    fetchActivities: async ({ entityId, entityType }) => {
        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()

            // Using the activity_feed view which includes user info
            let query = supabase
                .from('activity_feed')
                .select('*')
                .order('created_at', { ascending: false })

            if (entityId) {
                query = query.eq('entity_id', entityId)
            }
            if (entityType) {
                query = query.eq('entity_type', entityType)
            }

            const { data, error } = await query

            if (error) throw error

            const activities = (data || []).map(dbToActivity)
            set({ activities, isLoading: false })
        } catch (error: any) {
            console.error('Error fetching activities:', error)
            set({ error: error.message, isLoading: false })
        }
    },
}))
