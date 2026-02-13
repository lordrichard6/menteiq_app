import { create } from 'zustand'
import { Contact, CreateContactInput, ContactStatus } from '@/types/contact'
import { createClient } from '@/lib/supabase/client'
import { toE164 } from '@/lib/validation/contact'

export interface ContactFilters {
    search: string
    status: ContactStatus | 'all'
    statuses: ContactStatus[]
    tags: string[]
}

interface ContactStore {
    contacts: Contact[]
    isLoading: boolean
    error: string | null
    currentPage: number
    pageSize: number
    totalCount: number
    filters: ContactFilters
    sortConfig: {
        column: string
        ascending: boolean
    }
    visibleColumns: string[]
    selectedContactIds: string[]

    // Actions
    fetchContacts: () => Promise<void>
    setPage: (page: number) => void
    setPageSize: (size: number) => void
    setFilters: (filters: Partial<ContactFilters>) => void
    setSortConfig: (config: ContactStore['sortConfig']) => void
    addContact: (input: CreateContactInput) => Promise<Contact | null>
    updateContact: (id: string, updates: Partial<Contact>) => Promise<void>
    deleteContact: (id: string) => Promise<void>
    updateStatus: (id: string, status: ContactStatus) => Promise<void>
    getContact: (id: string) => Contact | undefined
    fetchContactById: (id: string) => Promise<Contact | null>
    toggleColumn: (columnId: string) => void
    toggleSelection: (id: string) => void
    clearSelection: () => void
    selectPage: (ids: string[]) => void
    mergeContacts: (primaryId: string, secondaryId: string, mergedData: Partial<Contact>) => Promise<boolean>
    bulkArchiveContacts: (ids: string[]) => Promise<void>
    checkDuplicate: (email?: string, phone?: string, excludeId?: string) => Promise<Contact | null>
    checkEmailDuplicate: (email: string, excludeId?: string) => Promise<boolean>
    setVisibleColumns: (columns: string[]) => void
}

// Helper to convert DB row to Contact type
function dbToContact(row: any): Contact {
    return {
        id: row.id,
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        isCompany: row.is_company || false,
        companyName: row.company_name,
        email: row.email || '',
        phone: row.phone,
        status: row.status || 'lead',
        tags: row.tags || [],
        notes: row.notes ? row.notes.split('\n').filter(Boolean) : [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        portal_enabled: row.portal_enabled,
        portal_token: row.portal_token,
        portal_invited_at: row.portal_invited_at,
        last_portal_login: row.last_portal_login,
    }
}

// Helper to convert Contact to DB format
function contactToDb(input: CreateContactInput) {
    return {
        first_name: input.firstName,
        last_name: input.lastName,
        is_company: input.isCompany,
        company_name: input.companyName || null,
        email: input.email,
        phone: input.phone ? toE164(input.phone) : null,
        status: input.status || 'lead',
        tags: input.tags || [],
        notes: null,
    }
}

export const useContactStore = create<ContactStore>()((set, get) => ({
    contacts: [],
    isLoading: false,
    error: null,
    currentPage: 1,
    pageSize: 50,
    totalCount: 0,
    filters: {
        search: '',
        status: 'all',
        statuses: [],
        tags: [],
    },
    sortConfig: {
        column: 'created_at',
        ascending: false,
    },
    visibleColumns: ['name', 'email', 'company', 'status', 'actions'],
    selectedContactIds: [],

    fetchContacts: async () => {
        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()
            const { currentPage, pageSize, filters, sortConfig } = get()

            // Verify authentication and get tenant_id
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

            if (!profile?.tenant_id) {
                set({ error: 'Please complete your organization setup.', isLoading: false })
                return
            }

            // Build base query
            let query = supabase
                .from('contacts')
                .select('*', { count: 'exact' })
                .eq('tenant_id', profile.tenant_id)
                .is('archived_at', null)

            // Dynamic Filtering
            if (filters.status !== 'all') {
                query = query.eq('status', filters.status)
            }

            if (filters.statuses.length > 0) {
                query = query.in('status', filters.statuses)
            }

            if (filters.tags.length > 0) {
                query = query.contains('tags', filters.tags)
            }

            if (filters.search) {
                const searchTerm = `%${filters.search}%`
                query = query.or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},company_name.ilike.${searchTerm}`)
            }

            // Server-side Sorting
            query = query.order(sortConfig.column, { ascending: sortConfig.ascending })

            // Server-side Pagination
            const from = (currentPage - 1) * pageSize
            const to = from + pageSize - 1
            query = query.range(from, to)

            const { data, error, count } = await query

            if (error) throw error

            const contacts = (data || []).map(dbToContact)
            set({
                contacts,
                totalCount: count || 0,
                isLoading: false
            })
        } catch (error: any) {
            console.error('Error fetching contacts:', error)
            set({ error: error.message, isLoading: false })
        }
    },

    setPage: (page) => {
        set({ currentPage: page })
        get().fetchContacts()
    },

    setPageSize: (size) => {
        set({ pageSize: size, currentPage: 1 })
        get().fetchContacts()
    },

    setFilters: (newFilters) => {
        set((state) => ({
            filters: { ...state.filters, ...newFilters },
            currentPage: 1 // Reset to first page
        }))
        get().fetchContacts()
    },

    setSortConfig: (config) => {
        set({ sortConfig: config })
        get().fetchContacts()
    },

    checkDuplicate: async (email?: string, phone?: string, excludeId?: string) => {
        if (!email && !phone) return null

        try {
            const supabase = createClient()
            let query = supabase
                .from('contacts')
                .select('*')
                .is('archived_at', null)

            if (excludeId) {
                query = query.neq('id', excludeId)
            }

            const orConditions = []
            if (email) orConditions.push(`email.eq.${email}`)
            if (phone) orConditions.push(`phone.eq.${toE164(phone)}`)

            if (orConditions.length > 0) {
                query = query.or(orConditions.join(','))
            } else {
                return null
            }

            const { data, error } = await query.limit(1).maybeSingle()
            if (error) throw error
            return data ? dbToContact(data) : null
        } catch (error) {
            console.error('Error checking duplicate:', error)
            return null
        }
    },

    toggleColumn: (columnId: string) => {
        set((state) => {
            const newColumns = state.visibleColumns.includes(columnId)
                ? state.visibleColumns.filter((id) => id !== columnId)
                : [...state.visibleColumns, columnId]

            if (typeof window !== 'undefined') {
                localStorage.setItem('orbit_contact_columns', JSON.stringify(newColumns))
            }

            return { visibleColumns: newColumns }
        })
    },

    toggleSelection: (id: string) => {
        set((state) => ({
            selectedContactIds: state.selectedContactIds.includes(id)
                ? state.selectedContactIds.filter((selectedId) => selectedId !== id)
                : [...state.selectedContactIds, id],
        }))
    },

    clearSelection: () => set({ selectedContactIds: [] }),

    selectPage: (ids: string[]) => {
        set((state) => {
            const allSelected = ids.every(id => state.selectedContactIds.includes(id))
            if (allSelected) {
                return {
                    selectedContactIds: state.selectedContactIds.filter(id => !ids.includes(id))
                }
            } else {
                const newSelection = new Set([...state.selectedContactIds, ...ids])
                return { selectedContactIds: Array.from(newSelection) }
            }
        })
    },

    mergeContacts: async (primaryId: string, secondaryId: string, mergedData: Partial<Contact>) => {
        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()
            const primary = get().contacts.find(c => c.id === primaryId) || await get().fetchContactById(primaryId)
            const secondary = get().contacts.find(c => c.id === secondaryId) || await get().fetchContactById(secondaryId)

            if (!primary || !secondary) throw new Error('Contacts not found')

            // 1. Prepare merged fields for DB
            const dbUpdates: Record<string, any> = {
                first_name: mergedData.firstName,
                last_name: mergedData.lastName,
                is_company: mergedData.isCompany,
                company_name: mergedData.companyName || null,
                email: mergedData.email,
                phone: mergedData.phone || null,
                status: mergedData.status,
                tags: Array.from(new Set([...primary.tags, ...secondary.tags])),
                // Merge notes - simple concatenation for now
                notes: [...primary.notes, ...secondary.notes].filter(Boolean).join('\n'),
                updated_at: new Date().toISOString()
            }

            // 2. Update Primary
            const { error: updateError } = await supabase
                .from('contacts')
                .update(dbUpdates)
                .eq('id', primaryId)

            if (updateError) throw updateError

            // 3. Archive Secondary
            const { error: archiveError } = await supabase
                .from('contacts')
                .update({
                    archived_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    notes: `Merged into ${primary.firstName} ${primary.lastName} (${primaryId})`
                })
                .eq('id', secondaryId)

            if (archiveError) throw archiveError

            // 4. Migrate related data (Invoices, Tasks, Projects)
            try {
                await Promise.all([
                    supabase.from('invoices').update({ contact_id: primaryId }).eq('contact_id', secondaryId),
                    supabase.from('tasks').update({ contact_id: primaryId }).eq('contact_id', secondaryId),
                    supabase.from('projects').update({ contact_id: primaryId }).eq('contact_id', secondaryId),
                ])
            } catch (migrationError) {
                console.error('Error migrating related data during merge:', migrationError)
                // We don't throw here to avoid failing the whole merge if one related update fails
                // but we might want to log this for debugging
            }

            // 5. Update local state
            set((state) => ({
                contacts: state.contacts
                    .filter(c => c.id !== secondaryId)
                    .map(c => c.id === primaryId ? {
                        ...c,
                        ...mergedData,
                        tags: dbUpdates.tags,
                        notes: [...primary.notes, ...secondary.notes].filter(Boolean),
                        updatedAt: new Date()
                    } : c),
                selectedContactIds: [],
                isLoading: false
            }))

            return true
        } catch (error: any) {
            console.error('Error merging contacts:', error)
            set({ error: error.message, isLoading: false })
            return false
        }
    },

    addContact: async (input) => {
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

            // Check for duplicates before adding
            const isDuplicate = await get().checkEmailDuplicate(input.email)
            if (isDuplicate) throw new Error('A contact with this email already exists')

            const dbData = {
                ...contactToDb(input),
                tenant_id: profile.tenant_id,
            }

            const { data, error } = await supabase
                .from('contacts')
                .insert(dbData)
                .select()
                .single()

            if (error) throw error

            const newContact = dbToContact(data)
            set((state) => ({ contacts: [newContact, ...state.contacts] }))
            return newContact
        } catch (error: any) {
            console.error('Error adding contact:', error)
            set({ error: error.message })
            return null
        }
    },

    updateContact: async (id, updates) => {
        set({ error: null })
        try {
            const supabase = createClient()

            // Build update object
            const dbUpdates: any = { updated_at: new Date().toISOString() }

            if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName
            if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName
            if (updates.isCompany !== undefined) dbUpdates.is_company = updates.isCompany
            if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName
            if (updates.email !== undefined) dbUpdates.email = updates.email
            if (updates.phone !== undefined) dbUpdates.phone = updates.phone
            if (updates.status !== undefined) dbUpdates.status = updates.status
            if (updates.tags !== undefined) dbUpdates.tags = updates.tags
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes.join('\n')

            const { error } = await supabase
                .from('contacts')
                .update(dbUpdates)
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                contacts: state.contacts.map((c) =>
                    c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
                ),
            }))
        } catch (error: any) {
            console.error('Error updating contact:', error)
            set({ error: error.message })
        }
    },

    deleteContact: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()

            // Standard CRM Industry practice: Archiving (Soft Delete)
            // instead of hard delete which would break invoice/project history
            const { error } = await supabase
                .from('contacts')
                .update({
                    archived_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                contacts: state.contacts.filter((c) => c.id !== id),
            }))
        } catch (error: any) {
            console.error('Error archiving contact:', error)
            set({ error: error.message })
        }
    },

    updateStatus: async (id: string, status: ContactStatus) => {
        await get().updateContact(id, { status })
    },

    bulkArchiveContacts: async (ids: string[]) => {
        if (!ids.length) return

        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('contacts')
                .update({
                    archived_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .in('id', ids)

            if (error) throw error

            set((state) => ({
                contacts: state.contacts.filter(c => !ids.includes(c.id)),
                selectedContactIds: state.selectedContactIds.filter(id => !ids.includes(id)),
                isLoading: false
            }))
        } catch (error: any) {
            console.error('Error bulk archiving contacts:', error)
            set({ error: error.message, isLoading: false })
            throw error
        }
    },

    getContact: (id) => {
        return get().contacts.find((c) => c.id === id)
    },

    fetchContactById: async (id) => {
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            if (!data) return null

            const contact = dbToContact(data)
            // Optionally update the store if the contact is already there or to cache it
            // For now just return it
            return contact
        } catch (error) {
            console.error('Error fetching individual contact:', error)
            return null
        }
    },

    checkEmailDuplicate: async (email, excludeId) => {
        if (!email) return false

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return false

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        if (!profile?.tenant_id) return false

        let query = supabase
            .from('contacts')
            .select('id')
            .eq('tenant_id', profile.tenant_id)
            .eq('email', email.toLowerCase().trim())
            .is('archived_at', null)

        if (excludeId) {
            query = query.neq('id', excludeId)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error checking duplicate email:', error)
            return false
        }

        return data.length > 0
    },

    setVisibleColumns: (columns: string[]) => {
        set({ visibleColumns: columns })
    },
}))
