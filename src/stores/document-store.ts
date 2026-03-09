import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { ProjectDocument, CreateDocumentInput } from '@/types/document'

interface DocumentStore {
    documents: ProjectDocument[]
    isLoading: boolean
    error: string | null

    // Actions
    fetchDocuments: (projectId?: string) => Promise<void>
    uploadDocument: (file: File, input: CreateDocumentInput) => Promise<ProjectDocument | null>
    updateDocument: (id: string, updates: Partial<Pick<ProjectDocument, 'name' | 'visibility'>>) => Promise<void>
    deleteDocument: (id: string) => Promise<void>
}

function dbToDocument(row: Record<string, unknown>): ProjectDocument {
    return {
        id: row.id as string,
        name: row.name as string,
        filePath: row.file_path as string,
        fileType: row.file_type as string,
        sizeBytes: row.size_bytes as number,
        visibility: row.visibility as ProjectDocument['visibility'],
        embeddingStatus: row.embedding_status as ProjectDocument['embeddingStatus'],
        contentSummary: (row.content_summary as string | null) ?? undefined,
        projectId: (row.project_id as string | null) ?? undefined,
        contactId: (row.contact_id as string | null) ?? undefined,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
    }
}

function errMsg(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error'
}

export const useDocumentStore = create<DocumentStore>()((set) => ({
    documents: [],
    isLoading: false,
    error: null,

    fetchDocuments: async (projectId) => {
        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()
            let query = supabase
                .from('documents')
                .select('*')
                .order('created_at', { ascending: false })

            if (projectId) {
                query = query.eq('project_id', projectId)
            }

            const { data, error } = await query

            if (error) throw error

            const documents = (data || []).map((row) => dbToDocument(row as Record<string, unknown>))
            set({ documents, isLoading: false })
        } catch (error: unknown) {
            console.error('Error fetching documents:', error)
            set({ error: errMsg(error), isLoading: false })
        }
    },

    uploadDocument: async (file, input) => {
        set({ error: null, isLoading: true })
        try {
            const supabase = createClient()

            // 1. Get current user & tenant
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

            if (!profile?.tenant_id) throw new Error('No organization found')

            // 2. Upload file to Storage
            const fileExt = file.name.split('.').pop()
            const filePath = `${profile.tenant_id}/${Math.random().toString(36).substring(2)}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 3. Create DB record
            const dbData = {
                tenant_id: profile.tenant_id,
                project_id: input.projectId || null,
                contact_id: input.contactId || null,
                name: input.name || file.name,
                file_path: filePath,
                file_type: file.type,
                size_bytes: file.size,
                visibility: input.visibility || 'internal',
                embedding_status: 'pending'
            }

            const { data, error: dbError } = await supabase
                .from('documents')
                .insert(dbData)
                .select()
                .single()

            if (dbError) throw dbError

            const newDoc = dbToDocument(data as Record<string, unknown>)
            set((state) => ({
                documents: [newDoc, ...state.documents],
                isLoading: false
            }))
            return newDoc
        } catch (error: unknown) {
            console.error('Error uploading document:', error)
            set({ error: errMsg(error), isLoading: false })
            return null
        }
    },

    updateDocument: async (id, updates) => {
        set({ error: null })
        try {
            const supabase = createClient()
            const dbUpdates: Record<string, string> = {}
            if (updates.name !== undefined) dbUpdates.name = updates.name
            if (updates.visibility !== undefined) dbUpdates.visibility = updates.visibility

            const { error } = await supabase
                .from('documents')
                .update(dbUpdates)
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                documents: state.documents.map((d) =>
                    d.id === id ? { ...d, ...updates } : d
                ),
            }))
        } catch (error: unknown) {
            console.error('Error updating document:', error)
            set({ error: errMsg(error) })
            throw error
        }
    },

    deleteDocument: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()

            // Get doc info first for file deletion
            const { data: doc } = await supabase
                .from('documents')
                .select('file_path')
                .eq('id', id)
                .single()

            if (doc?.file_path) {
                await supabase.storage
                    .from('documents')
                    .remove([doc.file_path])
            }

            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                documents: state.documents.filter((d) => d.id !== id),
            }))
        } catch (error: unknown) {
            console.error('Error deleting document:', error)
            set({ error: errMsg(error) })
        }
    },
}))
