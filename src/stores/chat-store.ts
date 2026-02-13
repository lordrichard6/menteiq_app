import { create } from 'zustand'
import { Conversation, Message, CreateConversationInput } from '@/types/chat'
import { createClient } from '@/lib/supabase/client'

interface ChatStore {
    conversations: Conversation[]
    activeConversationId: string | null
    isLoading: boolean
    error: string | null

    // Actions
    fetchConversations: () => Promise<void>
    createConversation: (input?: CreateConversationInput) => Promise<Conversation | null>
    deleteConversation: (id: string) => Promise<void>
    setActiveConversation: (id: string | null) => void
    addMessage: (conversationId: string, message: Omit<Message, 'id' | 'createdAt'>) => Promise<Message | null>
    getConversation: (id: string) => Conversation | undefined
    updateConversationTitle: (id: string, title: string) => Promise<void>
    updateConversationModel: (id: string, model: string) => Promise<void>
}

// Convert DB row to Message
function dbToMessage(row: any): Message {
    return {
        id: row.id,
        role: row.role,
        content: row.content,
        createdAt: new Date(row.created_at),
    }
}

// Convert DB row to Conversation
function dbToConversation(row: any): Conversation {
    return {
        id: row.id,
        title: row.title || 'New Conversation',
        messages: (row.ai_messages || []).map(dbToMessage),
        model: row.model || 'gpt-4o-mini',
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    }
}

export const useChatStore = create<ChatStore>()((set, get) => ({
    conversations: [],
    activeConversationId: null,
    isLoading: false,
    error: null,

    fetchConversations: async () => {
        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('ai_conversations')
                .select(`
                    *,
                    ai_messages (
                        id,
                        role,
                        content,
                        created_at
                    )
                `)
                .order('updated_at', { ascending: false })

            if (error) throw error

            const conversations = (data || []).map(dbToConversation)
            set({ conversations, isLoading: false })
        } catch (error: any) {
            console.error('Error fetching conversations:', error)
            set({ error: error.message, isLoading: false })
        }
    },

    createConversation: async (input) => {
        set({ error: null })
        try {
            const supabase = createClient()

            // Get current user
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
                user_id: user.id,
                title: input?.title || 'New Conversation',
                model: input?.model || 'gpt-4o-mini',
            }

            const { data, error } = await supabase
                .from('ai_conversations')
                .insert(dbData)
                .select()
                .single()

            if (error) throw error

            const newConversation: Conversation = {
                id: data.id,
                title: data.title,
                messages: [],
                model: data.model,
                createdAt: new Date(data.created_at),
                updatedAt: new Date(data.updated_at),
            }

            set((state) => ({
                conversations: [newConversation, ...state.conversations],
                activeConversationId: newConversation.id,
            }))
            return newConversation
        } catch (error: any) {
            console.error('Error creating conversation:', error)
            set({ error: error.message })
            return null
        }
    },

    deleteConversation: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()

            // Messages will be deleted via CASCADE
            const { error } = await supabase
                .from('ai_conversations')
                .delete()
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                conversations: state.conversations.filter((c) => c.id !== id),
                activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
            }))
        } catch (error: any) {
            console.error('Error deleting conversation:', error)
            set({ error: error.message })
        }
    },

    setActiveConversation: (id) => {
        set({ activeConversationId: id })
    },

    addMessage: async (conversationId, messageInput) => {
        set({ error: null })
        try {
            const supabase = createClient()

            const dbData = {
                conversation_id: conversationId,
                role: messageInput.role,
                content: messageInput.content,
            }

            const { data, error } = await supabase
                .from('ai_messages')
                .insert(dbData)
                .select()
                .single()

            if (error) throw error

            const newMessage = dbToMessage(data)

            // Update local state
            set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === conversationId
                        ? {
                            ...c,
                            messages: [...c.messages, newMessage],
                            updatedAt: new Date(),
                            // Auto-title from first user message
                            title: c.messages.length === 0 && messageInput.role === 'user'
                                ? messageInput.content.slice(0, 30) + (messageInput.content.length > 30 ? '...' : '')
                                : c.title,
                        }
                        : c
                ),
            }))

            // Update title in DB if this was the first message
            const conversation = get().conversations.find(c => c.id === conversationId)
            if (conversation && conversation.messages.length === 1 && messageInput.role === 'user') {
                const newTitle = messageInput.content.slice(0, 30) + (messageInput.content.length > 30 ? '...' : '')
                await supabase
                    .from('ai_conversations')
                    .update({ title: newTitle, updated_at: new Date().toISOString() })
                    .eq('id', conversationId)
            }

            return newMessage
        } catch (error: any) {
            console.error('Error adding message:', error)
            set({ error: error.message })
            return null
        }
    },

    getConversation: (id) => {
        return get().conversations.find((c) => c.id === id)
    },

    updateConversationTitle: async (id, title) => {
        set({ error: null })
        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('ai_conversations')
                .update({ title, updated_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === id ? { ...c, title, updatedAt: new Date() } : c
                ),
            }))
        } catch (error: any) {
            console.error('Error updating conversation title:', error)
            set({ error: error.message })
        }
    },

    updateConversationModel: async (id, model) => {
        set({ error: null })
        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('ai_conversations')
                .update({ model, updated_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === id ? { ...c, model, updatedAt: new Date() } : c
                ),
            }))
        } catch (error: any) {
            console.error('Error updating conversation model:', error)
            set({ error: error.message })
        }
    },
}))
