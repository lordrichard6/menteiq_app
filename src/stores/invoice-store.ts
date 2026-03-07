import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { calculateTotals } from '@/lib/invoices/totals'
import type {
    Invoice,
    InvoiceInsert,
    InvoiceLineItem,
    InvoiceStatus,
    InvoiceType,
} from '@/lib/types/schema'

// =====================================================
// TYPES
// =====================================================

export interface LineItemInput {
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
    sort_order?: number
}

export interface CreateInvoiceInput {
    contact_id: string | null
    project_id?: string | null
    currency: string
    invoice_type: InvoiceType
    due_date?: string | null
    notes?: string | null
    line_items: LineItemInput[]
}

export interface InvoiceWithLineItems extends Invoice {
    line_items: InvoiceLineItem[]
    contact?: {
        id: string
        first_name: string | null
        last_name: string | null
        company_name: string | null
        is_company: boolean
        email: string | null
    } | null
}

interface InvoiceStore {
    invoices: InvoiceWithLineItems[]
    isLoading: boolean
    error: string | null

    // Actions
    fetchInvoices: (projectId?: string) => Promise<void>
    fetchInvoice: (id: string) => Promise<void>
    addInvoice: (input: CreateInvoiceInput) => Promise<InvoiceWithLineItems | null>
    updateInvoice: (id: string, updates: Partial<Invoice>, lineItems?: LineItemInput[]) => Promise<void>
    deleteInvoice: (id: string) => Promise<boolean>
    markAsPaid: (id: string) => Promise<boolean>
    markAsSent: (id: string) => Promise<boolean>
    createPaymentLink: (id: string) => Promise<string | null>
    getInvoice: (id: string) => InvoiceWithLineItems | undefined
}

// =====================================================
// HELPERS
// =====================================================

function errMsg(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error'
}

function generateQRReference(): string {
    const randomDigits = Array.from({ length: 21 }, () =>
        Math.floor(Math.random() * 10)
    ).join('')
    return randomDigits.replace(/(.{5})/g, '$1 ').trim()
}

async function generateInvoiceNumber(tenantId: string): Promise<string> {
    const supabase = createClient()
    const year = new Date().getFullYear()

    const { data: org } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', tenantId)
        .single()

    const settings = (org?.settings as Record<string, unknown>) ?? {}
    const billing  = (settings.billing  as Record<string, unknown>) ?? {}
    const prefix   = (billing.invoice_prefix as string) ?? 'INV'

    const startOfYear = `${year}-01-01`
    const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfYear)

    const nextNumber   = (count ?? 0) + 1
    const paddedNumber = nextNumber.toString().padStart(4, '0')

    return `${prefix}-${year}-${paddedNumber}`
}

const INVOICE_SELECT = `
    *,
    contacts (
        id,
        first_name,
        last_name,
        company_name,
        is_company,
        email
    )
`

// =====================================================
// STORE
// =====================================================

export const useInvoiceStore = create<InvoiceStore>()((set, get) => ({
    invoices: [],
    isLoading: false,
    error: null,

    fetchInvoices: async (projectId) => {
        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()

            let query = supabase.from('invoices').select(INVOICE_SELECT)

            if (projectId) {
                query = query.eq('project_id', projectId)
            }

            const { data: invoices, error } = await query.order('created_at', { ascending: false })

            if (error) throw error

            // Fetch line items for all invoices in one query
            const invoiceIds = (invoices ?? []).map(i => i.id)
            const { data: allLineItems } = await supabase
                .from('invoice_line_items')
                .select('*')
                .in('invoice_id', invoiceIds)
                .order('sort_order', { ascending: true })

            // Group line items by invoice
            const lineItemsByInvoice = new Map<string, InvoiceLineItem[]>()
            for (const item of allLineItems ?? []) {
                const existing = lineItemsByInvoice.get(item.invoice_id) ?? []
                existing.push(item)
                lineItemsByInvoice.set(item.invoice_id, existing)
            }

            const invoicesWithLineItems: InvoiceWithLineItems[] = (invoices ?? []).map(invoice => ({
                ...invoice,
                contact:    invoice.contacts as InvoiceWithLineItems['contact'],
                line_items: lineItemsByInvoice.get(invoice.id) ?? [],
            }))

            // Auto-mark sent invoices as overdue when past their due date
            const today = new Date().toISOString().split('T')[0]
            const overdueIds: string[] = []
            for (const inv of invoicesWithLineItems) {
                if (inv.status === 'sent' && inv.due_date && inv.due_date < today) {
                    inv.status = 'overdue'
                    overdueIds.push(inv.id)
                }
            }
            if (overdueIds.length > 0) {
                await supabase
                    .from('invoices')
                    .update({ status: 'overdue' })
                    .in('id', overdueIds)
            }

            set({ invoices: invoicesWithLineItems, isLoading: false })
        } catch (error: unknown) {
            set({ error: errMsg(error), isLoading: false })
        }
    },

    fetchInvoice: async (id) => {
        set({ isLoading: true, error: null })
        try {
            const supabase = createClient()

            const { data: invoice, error } = await supabase
                .from('invoices')
                .select(INVOICE_SELECT)
                .eq('id', id)
                .single()

            if (error) throw error

            const { data: lineItems } = await supabase
                .from('invoice_line_items')
                .select('*')
                .eq('invoice_id', id)
                .order('sort_order', { ascending: true })

            const full: InvoiceWithLineItems = {
                ...invoice,
                contact:    invoice.contacts as InvoiceWithLineItems['contact'],
                line_items: lineItems ?? [],
            }

            set((state) => {
                const exists = state.invoices.some(i => i.id === id)
                return {
                    invoices: exists
                        ? state.invoices.map(i => (i.id === id ? full : i))
                        : [...state.invoices, full],
                    isLoading: false,
                }
            })
        } catch (error: unknown) {
            set({ error: errMsg(error), isLoading: false })
        }
    },

    addInvoice: async (input) => {
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

            // Get IBAN from org settings
            const { data: org } = await supabase
                .from('organizations')
                .select('settings')
                .eq('id', profile.tenant_id)
                .single()

            const settings = (org?.settings as Record<string, unknown>) ?? {}
            const billing  = (settings.billing  as Record<string, unknown>) ?? {}
            const iban     = (billing.iban as string) || null

            const totals        = calculateTotals(input.line_items)
            const invoiceNumber = await generateInvoiceNumber(profile.tenant_id)

            const invoiceData: InvoiceInsert = {
                tenant_id:           profile.tenant_id,
                contact_id:          input.contact_id,
                project_id:          input.project_id ?? null,
                invoice_number:      invoiceNumber,
                currency:            input.currency,
                invoice_type:        input.invoice_type,
                status:              'draft',
                subtotal:            totals.subtotal,
                tax_total:           totals.tax_total,
                amount_total:        totals.amount_total,
                due_date:            input.due_date ?? null,
                notes:               input.notes ?? null,
                qr_reference:        input.invoice_type === 'swiss_qr' ? generateQRReference() : null,
                iban_used:           iban,
                invoice_date:        new Date().toISOString().split('T')[0],
                paid_at:             null,
                stripe_payment_link: null,
                stripe_payment_id:   null,
            }

            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert(invoiceData)
                .select(INVOICE_SELECT)
                .single()

            if (invoiceError) throw invoiceError

            const lineItemsData = input.line_items.map((item, index) => ({
                invoice_id:  invoice.id,
                description: item.description,
                quantity:    item.quantity,
                unit_price:  item.unit_price,
                tax_rate:    item.tax_rate,
                sort_order:  item.sort_order ?? index,
            }))

            const { data: lineItems, error: lineItemsError } = await supabase
                .from('invoice_line_items')
                .insert(lineItemsData)
                .select()

            if (lineItemsError) {
                await supabase.from('invoices').delete().eq('id', invoice.id)
                throw lineItemsError
            }

            const newInvoice: InvoiceWithLineItems = {
                ...invoice,
                contact:    invoice.contacts as InvoiceWithLineItems['contact'],
                line_items: lineItems ?? [],
            }

            set((state) => ({ invoices: [newInvoice, ...state.invoices] }))
            return newInvoice
        } catch (error: unknown) {
            set({ error: errMsg(error) })
            return null
        }
    },

    updateInvoice: async (id, updates, lineItems) => {
        set({ error: null })
        try {
            const supabase = createClient()

            const dbUpdates: Partial<InvoiceInsert> = {}

            if (updates.contact_id   !== undefined) dbUpdates.contact_id   = updates.contact_id
            if (updates.project_id   !== undefined) dbUpdates.project_id   = updates.project_id
            if (updates.currency     !== undefined) dbUpdates.currency     = updates.currency
            if (updates.invoice_type !== undefined) dbUpdates.invoice_type = updates.invoice_type
            if (updates.status       !== undefined) dbUpdates.status       = updates.status
            if (updates.due_date     !== undefined) dbUpdates.due_date     = updates.due_date
            if (updates.notes        !== undefined) dbUpdates.notes        = updates.notes

            if (lineItems) {
                const totals = calculateTotals(lineItems)
                dbUpdates.subtotal     = totals.subtotal
                dbUpdates.tax_total    = totals.tax_total
                dbUpdates.amount_total = totals.amount_total

                await supabase.from('invoice_line_items').delete().eq('invoice_id', id)

                const lineItemsData = lineItems.map((item, index) => ({
                    invoice_id:  id,
                    description: item.description,
                    quantity:    item.quantity,
                    unit_price:  item.unit_price,
                    tax_rate:    item.tax_rate,
                    sort_order:  item.sort_order ?? index,
                }))

                await supabase.from('invoice_line_items').insert(lineItemsData)
            }

            if (Object.keys(dbUpdates).length > 0) {
                const { error } = await supabase
                    .from('invoices')
                    .update(dbUpdates)
                    .eq('id', id)

                if (error) throw error
            }

            // Targeted re-fetch of only this invoice
            await get().fetchInvoice(id)
        } catch (error: unknown) {
            set({ error: errMsg(error) })
        }
    },

    deleteInvoice: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase.from('invoices').delete().eq('id', id)

            if (error) throw error

            set((state) => ({
                invoices: state.invoices.filter(i => i.id !== id),
            }))
            return true
        } catch (error: unknown) {
            set({ error: errMsg(error) })
            return false
        }
    },

    markAsPaid: async (id) => {
        // Validate state transition
        const current = get().invoices.find(i => i.id === id)
        if (current && !['sent', 'overdue'].includes(current.status)) {
            set({ error: `Cannot mark as paid: invoice status is '${current.status}'` })
            return false
        }
        set({ error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('invoices')
                .update({
                    status:  'paid',
                    paid_at: new Date().toISOString(),
                })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                invoices: state.invoices.map(i =>
                    i.id === id
                        ? { ...i, status: 'paid' as InvoiceStatus, paid_at: new Date().toISOString() }
                        : i
                ),
            }))
            return true
        } catch (error: unknown) {
            set({ error: errMsg(error) })
            return false
        }
    },

    markAsSent: async (id) => {
        // Validate state transition
        const current = get().invoices.find(i => i.id === id)
        if (current && current.status !== 'draft') {
            set({ error: `Cannot mark as sent: invoice status is '${current.status}'` })
            return false
        }
        set({ error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'sent' })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                invoices: state.invoices.map(i =>
                    i.id === id ? { ...i, status: 'sent' as InvoiceStatus } : i
                ),
            }))
            return true
        } catch (error: unknown) {
            set({ error: errMsg(error) })
            return false
        }
    },

    createPaymentLink: async (id) => {
        set({ error: null })
        try {
            const response = await fetch(`/api/invoices/${id}/payment-link`, {
                method: 'POST',
            })

            if (!response.ok) {
                const data = await response.json() as { error?: string }
                throw new Error(data.error ?? 'Failed to create payment link')
            }

            const { payment_link } = await response.json() as { payment_link: string }

            set((state) => ({
                invoices: state.invoices.map(i =>
                    i.id === id ? { ...i, stripe_payment_link: payment_link } : i
                ),
            }))

            return payment_link
        } catch (error: unknown) {
            set({ error: errMsg(error) })
            return null
        }
    },

    getInvoice: (id) => {
        return get().invoices.find(i => i.id === id)
    },
}))
