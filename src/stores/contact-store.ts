import { create } from 'zustand'
import { Contact, CreateContactInput, ContactStatus } from '@/types/contact'
import { createClient } from '@/lib/supabase/client'
import { toE164 } from '@/lib/validation/contact'
import { toast } from 'sonner'
import { ActivityLogger } from '@/lib/activity-log'

export interface ContactFilters {
    search: string
    status: ContactStatus | 'all'
    statuses: ContactStatus[]
    tags: string[]
    showArchived?: boolean
}

interface ContactStore {
    contacts: Contact[]
    allContacts: Contact[]
    allTags: string[]
    statusCounts: Record<ContactStatus, number>
    isLoading: boolean
    isLoadingKanban: boolean
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
    fetchAllContactsForKanban: () => Promise<void>
    fetchAllTags: () => Promise<void>
    fetchStatusCounts: () => Promise<void>
    setPage: (page: number) => void
    setPageSize: (size: number) => void
    setFilters: (filters: Partial<ContactFilters>) => void
    setSortConfig: (config: ContactStore['sortConfig']) => void
    addContact: (input: CreateContactInput) => Promise<Contact | null>
    updateContact: (id: string, updates: Partial<Contact>) => Promise<void>
    deleteContact: (id: string) => Promise<void>
    restoreContact: (id: string) => Promise<void>
    updateStatus: (id: string, status: ContactStatus) => Promise<void>
    bulkUpdateStatus: (ids: string[], status: ContactStatus) => Promise<void>
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

const COLUMN_STORAGE_KEY = 'menteiq_contact_columns'

// Helper to convert DB row to Contact type
function dbToContact(row: Record<string, unknown>): Contact {
    return {
        id: row.id as string,
        firstName: (row.first_name as string) || '',
        lastName: (row.last_name as string) || '',
        isCompany: (row.is_company as boolean) || false,
        companyName: row.company_name as string | undefined,
        email: (row.email as string) || '',
        phone: row.phone as string | undefined,
        // Address fields
        addressLine1: row.address_line1 as string | undefined,
        addressLine2: row.address_line2 as string | undefined,
        city: row.city as string | undefined,
        postalCode: row.postal_code as string | undefined,
        country: row.country as string | undefined,
        status: (row.status as ContactStatus) || 'lead',
        tags: (row.tags as string[]) || [],
        notes: row.notes ? (row.notes as string).split('\n').filter(Boolean) : [],
        // GDPR / Consent
        marketingConsent: row.marketing_consent as boolean | undefined,
        dataProcessingConsent: row.data_processing_consent as boolean | undefined,
        consentDate: row.consent_date as string | undefined,
        // Portal access fields
        portal_enabled: row.portal_enabled as boolean | undefined,
        portal_token: row.portal_token as string | undefined,
        portal_invited_at: row.portal_invited_at as Date | string | undefined,
        last_portal_login: row.last_portal_login as Date | string | undefined,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
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

// Helper to get display name for a contact
function getContactName(contact: Contact): string {
    return contact.isCompany
        ? (contact.companyName || 'Unknown Company')
        : `${contact.firstName} ${contact.lastName}`.trim()
}

export const useContactStore = create<ContactStore>()((set, get) => ({
    contacts: [],
    allContacts: [],
    allTags: [],
    statusCounts: { lead: 0, opportunity: 0, client: 0, churned: 0 },
    isLoading: false,
    isLoadingKanban: false,
    error: null,
    currentPage: 1,
    pageSize: 50,
    totalCount: 0,
    filters: {
        search: '',
        status: 'all',
        statuses: [],
        tags: [],
        showArchived: false,
    },
    sortConfig: {
        column: 'created_at',
        ascending: false,
    },
    visibleColumns: ['name', 'email', 'phone', 'company', 'status', 'actions'],
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

            // Archived filter
            if (filters.showArchived) {
                query = query.not('archived_at', 'is', null)
            } else {
                query = query.is('archived_at', null)
            }

            // Dynamic Filtering
            if (filters.status !== 'all') {
                query = query.eq('status', filters.status)
            }

            if (filters.statuses && filters.statuses.length > 0) {
                query = query.in('status', filters.statuses)
            }

            if (filters.tags && filters.tags.length > 0) {
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

            const contacts = (data || []).map(row => dbToContact(row as Record<string, unknown>))
            set({
                contacts,
                totalCount: count || 0,
                isLoading: false,
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            console.error('Error fetching contacts:', error)
            set({ error: message, isLoading: false })
        }
    },

    fetchAllContactsForKanban: async () => {
        set({ isLoadingKanban: true })
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

            if (!profile?.tenant_id) return

            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .is('archived_at', null)
                .order('created_at', { ascending: false })

            if (error) throw error

            const allContacts = (data || []).map(row => dbToContact(row as Record<string, unknown>))
            set({ allContacts, isLoadingKanban: false })
        } catch (error: unknown) {
            console.error('Error fetching all contacts for kanban:', error)
            set({ isLoadingKanban: false })
        }
    },

    fetchAllTags: async () => {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

            if (!profile?.tenant_id) return

            const { data, error } = await supabase
                .from('contacts')
                .select('tags')
                .eq('tenant_id', profile.tenant_id)
                .is('archived_at', null)

            if (error) throw error

            const tagSet = new Set<string>()
            ;(data || []).forEach(row => {
                const tags = row.tags as string[] | null
                if (Array.isArray(tags)) {
                    tags.forEach(t => tagSet.add(t))
                }
            })

            set({ allTags: Array.from(tagSet).sort() })
        } catch (error: unknown) {
            console.error('Error fetching all tags:', error)
        }
    },

    fetchStatusCounts: async () => {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

            if (!profile?.tenant_id) return

            const { data, error } = await supabase
                .from('contacts')
                .select('status')
                .eq('tenant_id', profile.tenant_id)
                .is('archived_at', null)

            if (error) throw error

            const counts: Record<ContactStatus, number> = { lead: 0, opportunity: 0, client: 0, churned: 0 }
            ;(data || []).forEach(row => {
                const s = row.status as ContactStatus
                if (s in counts) counts[s]++
            })

            set({ statusCounts: counts })
        } catch (error: unknown) {
            console.error('Error fetching status counts:', error)
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
            currentPage: 1, // Reset to first page
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

            // Scope duplicate check to the current tenant only
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

            if (!profile?.tenant_id) return null

            let query = supabase
                .from('contacts')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .is('archived_at', null)

            if (excludeId) {
                query = query.neq('id', excludeId)
            }

            const orConditions: string[] = []
            if (email) orConditions.push(`email.eq.${email}`)
            if (phone) orConditions.push(`phone.eq.${toE164(phone)}`)

            if (orConditions.length > 0) {
                query = query.or(orConditions.join(','))
            } else {
                return null
            }

            const { data, error } = await query.limit(1).maybeSingle()
            if (error) throw error
            return data ? dbToContact(data as Record<string, unknown>) : null
        } catch (error: unknown) {
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
                localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(newColumns))
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
                    selectedContactIds: state.selectedContactIds.filter(id => !ids.includes(id)),
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
            const mergedTags = Array.from(new Set([...primary.tags, ...secondary.tags]))
            const mergedNotes = [...primary.notes, ...secondary.notes].filter(Boolean)

            const dbUpdates: Record<string, unknown> = {
                first_name: mergedData.firstName,
                last_name: mergedData.lastName,
                is_company: mergedData.isCompany,
                company_name: mergedData.companyName || null,
                email: mergedData.email,
                phone: mergedData.phone || null,
                status: mergedData.status,
                tags: mergedTags,
                notes: mergedNotes.join('\n'),
                updated_at: new Date().toISOString(),
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
                    notes: `Merged into ${primary.firstName} ${primary.lastName} (${primaryId})`,
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
            }

            // 5. Update local state
            set((state) => ({
                contacts: state.contacts
                    .filter(c => c.id !== secondaryId)
                    .map(c => c.id === primaryId ? {
                        ...c,
                        ...mergedData,
                        tags: mergedTags,
                        notes: mergedNotes,
                        updatedAt: new Date(),
                    } : c),
                selectedContactIds: [],
                isLoading: false,
            }))

            const primaryName = getContactName(primary)
            const secondaryName = getContactName(secondary)
            toast.success('Contacts merged', {
                description: `"${secondaryName}" was merged into "${primaryName}".`,
            })

            return true
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            console.error('Error merging contacts:', error)
            set({ error: message, isLoading: false })
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

            const newContact = dbToContact(data as Record<string, unknown>)
            set((state) => ({ contacts: [newContact, ...state.contacts] }))

            const name = getContactName(newContact)
            toast.success('Contact added', { description: `"${name}" was created successfully.` })

            // Log activity (non-blocking)
            ActivityLogger.contactCreated(newContact.id, name).catch(console.error)

            return newContact
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            console.error('Error adding contact:', error)
            set({ error: message })
            return null
        }
    },

    updateContact: async (id, updates) => {
        set({ error: null })
        try {
            const supabase = createClient()

            // Build update object
            const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }

            if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName
            if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName
            if (updates.isCompany !== undefined) dbUpdates.is_company = updates.isCompany
            if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName
            if (updates.email !== undefined) dbUpdates.email = updates.email
            if (updates.phone !== undefined) dbUpdates.phone = updates.phone
            if (updates.status !== undefined) dbUpdates.status = updates.status
            if (updates.tags !== undefined) dbUpdates.tags = updates.tags
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes.join('\n')
            // Address fields
            if (updates.addressLine1 !== undefined) dbUpdates.address_line1 = updates.addressLine1
            if (updates.addressLine2 !== undefined) dbUpdates.address_line2 = updates.addressLine2
            if (updates.city !== undefined) dbUpdates.city = updates.city
            if (updates.postalCode !== undefined) dbUpdates.postal_code = updates.postalCode
            if (updates.country !== undefined) dbUpdates.country = updates.country

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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            console.error('Error updating contact:', error)
            set({ error: message })
        }
    },

    deleteContact: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()

            const contact = get().contacts.find(c => c.id === id)

            // Standard CRM Industry practice: Archiving (Soft Delete)
            // instead of hard delete which would break invoice/project history
            const { error } = await supabase
                .from('contacts')
                .update({
                    archived_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                contacts: state.contacts.filter((c) => c.id !== id),
            }))

            const name = contact ? getContactName(contact) : 'Contact'
            toast.success('Contact archived', { description: `"${name}" was moved to archived.` })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            console.error('Error archiving contact:', error)
            set({ error: message })
        }
    },

    restoreContact: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()

            const contact = get().contacts.find(c => c.id === id)

            const { error } = await supabase
                .from('contacts')
                .update({
                    archived_at: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                contacts: state.contacts.filter((c) => c.id !== id),
            }))

            const name = contact ? getContactName(contact) : 'Contact'
            toast.success('Contact restored', { description: `"${name}" is now active again.` })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            console.error('Error restoring contact:', error)
            set({ error: message })
        }
    },

    updateStatus: async (id: string, status: ContactStatus) => {
        const contact = get().contacts.find(c => c.id === id)
        const oldStatus = contact?.status

        await get().updateContact(id, { status })

        // Also sync allContacts (kanban) immediately
        set((state) => ({
            allContacts: state.allContacts.map(c =>
                c.id === id ? { ...c, status } : c
            ),
        }))

        // Log activity (non-blocking)
        if (contact && oldStatus && oldStatus !== status) {
            const name = getContactName(contact)
            ActivityLogger.contactStatusChanged(id, name, oldStatus, status).catch(console.error)
        }
    },

    bulkUpdateStatus: async (ids: string[], status: ContactStatus) => {
        if (!ids.length) return

        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('contacts')
                .update({
                    status,
                    updated_at: new Date().toISOString(),
                })
                .in('id', ids)

            if (error) throw error

            set((state) => ({
                contacts: state.contacts.map(c =>
                    ids.includes(c.id) ? { ...c, status, updatedAt: new Date() } : c
                ),
                selectedContactIds: [],
                isLoading: false,
            }))

            toast.success('Status updated', {
                description: `${ids.length} contact${ids.length !== 1 ? 's' : ''} moved to "${status}".`,
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            console.error('Error bulk updating status:', error)
            set({ error: message, isLoading: false })
            throw error
        }
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
                    updated_at: new Date().toISOString(),
                })
                .in('id', ids)

            if (error) throw error

            set((state) => ({
                contacts: state.contacts.filter(c => !ids.includes(c.id)),
                selectedContactIds: state.selectedContactIds.filter(id => !ids.includes(id)),
                isLoading: false,
            }))

            toast.success(`${ids.length} contact${ids.length !== 1 ? 's' : ''} archived`)
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            console.error('Error bulk archiving contacts:', error)
            set({ error: message, isLoading: false })
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

            return dbToContact(data as Record<string, unknown>)
        } catch (error: unknown) {
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
