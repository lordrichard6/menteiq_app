'use client'

/**
 * /invoices/new page
 *
 * Opens the CreateInvoiceDialog immediately. Supports an optional ?contact= search
 * parameter to pre-select a contact (used by the Contact → Invoices tab "New Invoice" button).
 * After the dialog closes (save or cancel), navigates back to /invoices.
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { CreateInvoiceDialog } from '@/components/modules/invoicing/create-invoice-dialog'
import { Suspense } from 'react'

function NewInvoiceContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const contactId = searchParams.get('contact') ?? undefined

    return (
        <CreateInvoiceDialog
            defaultOpen={true}
            defaultContactId={contactId}
            onOpenChange={(open) => {
                if (!open) router.push('/invoices')
            }}
        />
    )
}

export default function NewInvoicePage() {
    return (
        <Suspense>
            <NewInvoiceContent />
        </Suspense>
    )
}
