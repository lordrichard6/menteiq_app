import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type {
    Invoice,
    InvoiceLineItem,
    InvoiceStatus,
    InvoiceType
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
    addInvoice: (input: CreateInvoiceInput) => Promise<InvoiceWithLineItems | null>
    updateInvoice: (id: string, updates: Partial<Invoice>, lineItems?: LineItemInput[]) => Promise<void>
    deleteInvoice: (id: string) => Promise<void>
    markAsPaid: (id: string) => Promise<void>
    markAsSent: (id: string) => Promise<void>
    createPaymentLink: (id: string) => Promise<string | null>
    getInvoice: (id: string) => InvoiceWithLineItems | undefined
}

// =====================================================
// HELPERS
// =====================================================

function calculateTotals(lineItems: LineItemInput[]): {
    subtotal: number
    tax_total: number
    amount_total: number
} {
    let subtotal = 0
    let tax_total = 0

    for (const item of lineItems) {
        const lineTotal = item.quantity * item.unit_price
        const lineTax = lineTotal * (item.tax_rate / 100)
        subtotal += lineTotal
        tax_total += lineTax
    }

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        tax_total: Math.round(tax_total * 100) / 100,
        amount_total: Math.round((subtotal + tax_total) * 100) / 100,
    }
}

function generateQRReference(): string {
    // Generate a random 21-digit number for QR reference
    const randomDigits = Array.from({ length: 21 }, () =>
        Math.floor(Math.random() * 10)
    ).join('')

    return randomDigits.replace(/(.{5})/g, '$1 ').trim()
}

async function generateInvoiceNumber(supabase: any, tenantId: string): Promise<string> {
    const year = new Date().getFullYear()

    // Get organization settings for prefix
    const { data: org } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', tenantId)
        .single()

    const settings = (org?.settings as Record<string, unknown>) || {}
    const billing = (settings.billing as Record<string, unknown>) || {}
    const prefix = (billing.invoice_prefix as string) || 'INV'

    // Count existing invoices this year for this tenant
    const startOfYear = `${year}-01-01`
    const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfYear)

    const nextNumber = (count || 0) + 1
    const paddedNumber = nextNumber.toString().padStart(4, '0')

    return `${prefix}-${year}-${paddedNumber}`
}

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

            // Fetch invoices with contacts
            let query = supabase
                .from('invoices')
                .select(`
                    *,
                    contacts (
                        id,
                        first_name,
                        last_name,
                        company_name,
                        is_company,
                        email
                    )
                `)

            if (projectId) {
                query = query.eq('project_id', projectId)
            }

            const { data: invoices, error } = await query.order('created_at', { ascending: false })

            if (error) throw error

            // Fetch line items for all invoices
            const invoiceIds = (invoices || []).map(i => i.id)
            const { data: allLineItems } = await supabase
                .from('invoice_line_items')
                .select('*')
                .in('invoice_id', invoiceIds)
                .order('sort_order', { ascending: true })

            // Group line items by invoice
            const lineItemsByInvoice = new Map<string, InvoiceLineItem[]>()
            for (const item of allLineItems || []) {
                const existing = lineItemsByInvoice.get(item.invoice_id) || []
                existing.push(item)
                lineItemsByInvoice.set(item.invoice_id, existing)
            }

            // Combine invoices with line items
            const invoicesWithLineItems: InvoiceWithLineItems[] = (invoices || []).map(invoice => ({
                ...invoice,
                contact: invoice.contacts as InvoiceWithLineItems['contact'],
                line_items: lineItemsByInvoice.get(invoice.id) || [],
            }))

            set({ invoices: invoicesWithLineItems, isLoading: false })
        } catch (error: any) {
            console.error('Error fetching invoices:', error)
            set({ error: error.message, isLoading: false })
        }
    },

    addInvoice: async (input) => {
        set({ error: null })
        try {
            const supabase = createClient()

            // Get current user's tenant_id and IBAN
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

            if (!profile?.tenant_id) throw new Error('No organization found')

            // Get organization settings for IBAN
            const { data: org } = await supabase
                .from('organizations')
                .select('settings')
                .eq('id', profile.tenant_id)
                .single()

            const settings = (org?.settings as Record<string, unknown>) || {}
            const billing = (settings.billing as Record<string, unknown>) || {}
            const iban = (billing.iban as string) || null

            // Calculate totals
            const totals = calculateTotals(input.line_items)

            // Generate invoice number
            const invoiceNumber = await generateInvoiceNumber(supabase, profile.tenant_id)

            // Create invoice record
            const invoiceData = {
                tenant_id: profile.tenant_id,
                contact_id: input.contact_id,
                project_id: input.project_id || null,
                invoice_number: invoiceNumber,
                currency: input.currency,
                invoice_type: input.invoice_type,
                status: 'draft' as InvoiceStatus,
                subtotal: totals.subtotal,
                tax_total: totals.tax_total,
                amount_total: totals.amount_total,
                due_date: input.due_date || null,
                notes: input.notes || null,
                qr_reference: input.invoice_type === 'swiss_qr' ? generateQRReference() : null,
                iban_used: iban,
                invoice_date: new Date().toISOString().split('T')[0],
            }

            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert(invoiceData)
                .select(`
                    *,
                    contacts (
                        id,
                        first_name,
                        last_name,
                        company_name,
                        is_company,
                        email
                    )
                `)
                .single()

            if (invoiceError) throw invoiceError

            // Create line items
            const lineItemsData = input.line_items.map((item, index) => ({
                invoice_id: invoice.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate,
                sort_order: item.sort_order ?? index,
            }))

            const { data: lineItems, error: lineItemsError } = await supabase
                .from('invoice_line_items')
                .insert(lineItemsData)
                .select()

            if (lineItemsError) {
                // Rollback: delete the invoice if line items fail
                await supabase.from('invoices').delete().eq('id', invoice.id)
                throw lineItemsError
            }

            const newInvoice: InvoiceWithLineItems = {
                ...invoice,
                contact: invoice.contacts as InvoiceWithLineItems['contact'],
                line_items: lineItems || [],
            }

            set((state) => ({ invoices: [newInvoice, ...state.invoices] }))
            return newInvoice
        } catch (error: any) {
            console.error('Error adding invoice:', error)
            set({ error: error.message })
            return null
        }
    },

    updateInvoice: async (id, updates, lineItems) => {
        set({ error: null })
        try {
            const supabase = createClient()

            // Build update object
            const dbUpdates: any = {}

            if (updates.contact_id !== undefined) dbUpdates.contact_id = updates.contact_id
            if (updates.project_id !== undefined) dbUpdates.project_id = updates.project_id
            if (updates.currency !== undefined) dbUpdates.currency = updates.currency
            if (updates.invoice_type !== undefined) dbUpdates.invoice_type = updates.invoice_type
            if (updates.status !== undefined) dbUpdates.status = updates.status
            if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes

            // If line items are provided, recalculate totals
            if (lineItems) {
                const totals = calculateTotals(lineItems)
                dbUpdates.subtotal = totals.subtotal
                dbUpdates.tax_total = totals.tax_total
                dbUpdates.amount_total = totals.amount_total

                // Delete existing line items
                await supabase
                    .from('invoice_line_items')
                    .delete()
                    .eq('invoice_id', id)

                // Insert new line items
                const lineItemsData = lineItems.map((item, index) => ({
                    invoice_id: id,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate,
                    sort_order: item.sort_order ?? index,
                }))

                await supabase
                    .from('invoice_line_items')
                    .insert(lineItemsData)
            }

            // Update invoice
            if (Object.keys(dbUpdates).length > 0) {
                const { error } = await supabase
                    .from('invoices')
                    .update(dbUpdates)
                    .eq('id', id)

                if (error) throw error
            }

            // Refresh invoices
            await get().fetchInvoices()
        } catch (error: any) {
            console.error('Error updating invoice:', error)
            set({ error: error.message })
        }
    },

    deleteInvoice: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                invoices: state.invoices.filter((i) => i.id !== id),
            }))
        } catch (error: any) {
            console.error('Error deleting invoice:', error)
            set({ error: error.message })
        }
    },

    markAsPaid: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('invoices')
                .update({
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                invoices: state.invoices.map((i) =>
                    i.id === id
                        ? { ...i, status: 'paid' as InvoiceStatus, paid_at: new Date().toISOString() }
                        : i
                ),
            }))
        } catch (error: any) {
            console.error('Error marking invoice as paid:', error)
            set({ error: error.message })
        }
    },

    markAsSent: async (id) => {
        set({ error: null })
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'sent' })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                invoices: state.invoices.map((i) =>
                    i.id === id ? { ...i, status: 'sent' as InvoiceStatus } : i
                ),
            }))
        } catch (error: any) {
            console.error('Error marking invoice as sent:', error)
            set({ error: error.message })
        }
    },

    createPaymentLink: async (id) => {
        set({ error: null })
        try {
            const response = await fetch(`/api/invoices/${id}/payment-link`, {
                method: 'POST',
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to create payment link')
            }

            const { payment_link } = await response.json()

            // Update local state with payment link
            set((state) => ({
                invoices: state.invoices.map((i) =>
                    i.id === id ? { ...i, stripe_payment_link: payment_link } : i
                ),
            }))

            return payment_link
        } catch (error: any) {
            console.error('Error creating payment link:', error)
            set({ error: error.message })
            return null
        }
    },

    getInvoice: (id) => {
        return get().invoices.find((i) => i.id === id)
    },
}))
