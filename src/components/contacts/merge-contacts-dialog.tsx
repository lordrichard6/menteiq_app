'use client'

import { useState, useEffect } from "react"
import { Contact, ContactStatus, STATUS_LABELS } from "@/types/contact"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useContactStore } from "@/stores/contact-store"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Info } from "lucide-react"

interface MergeContactsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    contacts: Contact[]
}

export function MergeContactsDialog({ open, onOpenChange, contacts }: MergeContactsDialogProps) {
    const mergeContacts = useContactStore(state => state.mergeContacts)
    const [isMerging, setIsMerging] = useState(false)

    // State for winning fields
    const [primaryId, setPrimaryId] = useState<string>(contacts[0]?.id || '')
    const [mergedData, setMergedData] = useState<Partial<Contact>>(() => {
        const first = contacts[0]
        if (!first) return {}
        return {
            firstName: first.firstName,
            lastName: first.lastName,
            isCompany: first.isCompany,
            companyName: first.companyName,
            email: first.email,
            phone: first.phone,
            status: first.status,
        }
    })

    // Reset state when contacts change and dialog opens
    useEffect(() => {
        if (open && contacts.length === 2) {
            const first = contacts[0]
            setPrimaryId(prev => prev === first.id ? prev : first.id)
            setMergedData({
                firstName: first.firstName,
                lastName: first.lastName,
                isCompany: first.isCompany,
                companyName: first.companyName,
                email: first.email,
                phone: first.phone,
                status: first.status,
            })
        }
    }, [contacts, open])

    if (contacts.length !== 2) return null

    const contactA = contacts[0]
    const contactB = contacts[1]

    const handleFieldSelect = <K extends keyof Contact>(field: K, value: Contact[K], sourceId: string) => {
        setMergedData(prev => ({ ...prev, [field]: value }))
        if (field === 'id') setPrimaryId(sourceId)
    }

    const handleMerge = async () => {
        setIsMerging(true)
        const secondaryId = contactA.id === primaryId ? contactB.id : contactA.id

        const success = await mergeContacts(primaryId, secondaryId, mergedData)

        if (success) {
            toast.success("Contacts merged successfully")
            onOpenChange(false)
        } else {
            toast.error("Failed to merge contacts")
        }
        setIsMerging(false)
    }

    const renderFieldRow = (label: string, field: keyof Contact) => {
        const valA = contactA[field]
        const valB = contactB[field]
        const currentVal = mergedData[field]

        return (
            <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-slate-100 last:border-0">
                <div className="text-sm font-medium text-slate-500">{label}</div>
                <div
                    className={`p-2 rounded-md cursor-pointer border transition-colors ${currentVal === valA ? 'border-[#3D4A67] bg-[#3D4A67]/5' : 'border-slate-200 hover:border-slate-300'}`}
                    onClick={() => handleFieldSelect(field, valA, contactA.id)}
                >
                    <div className="text-sm break-all">{valA as string || '-'}</div>
                </div>
                <div
                    className={`p-2 rounded-md cursor-pointer border transition-colors ${currentVal === valB ? 'border-[#3D4A67] bg-[#3D4A67]/5' : 'border-slate-200 hover:border-slate-300'}`}
                    onClick={() => handleFieldSelect(field, valB, contactB.id)}
                >
                    <div className="text-sm break-all">{valB as string || '-'}</div>
                </div>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl text-slate-900 border-slate-200">
                <DialogHeader>
                    <DialogTitle className="text-[#3D4A67]">Merge Contacts</DialogTitle>
                    <DialogDescription>
                        Reconcile data between two contacts. Select the values you want to keep in the final record.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="grid grid-cols-3 gap-4 mb-4 text-xs font-bold uppercase tracking-wider text-slate-400 px-2">
                        <div>Field</div>
                        <div>Contact A</div>
                        <div>Contact B</div>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto px-2">
                        {renderFieldRow("First Name", "firstName")}
                        {renderFieldRow("Last Name", "lastName")}
                        {renderFieldRow("Email", "email")}
                        {renderFieldRow("Phone", "phone")}
                        {renderFieldRow("Company", "companyName")}

                        {/* Special handling for status which is a badge */}
                        <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-slate-100">
                            <div className="text-sm font-medium text-slate-500">Status</div>
                            <div
                                className={`p-2 rounded-md cursor-pointer border transition-colors ${mergedData.status === contactA.status ? 'border-[#3D4A67] bg-[#3D4A67]/5' : 'border-slate-200 hover:border-slate-300'}`}
                                onClick={() => handleFieldSelect('status', contactA.status, contactA.id)}
                            >
                                <Badge variant="outline" className="font-normal">{STATUS_LABELS[contactA.status]}</Badge>
                            </div>
                            <div
                                className={`p-2 rounded-md cursor-pointer border transition-colors ${mergedData.status === contactB.status ? 'border-[#3D4A67] bg-[#3D4A67]/5' : 'border-slate-200 hover:border-slate-300'}`}
                                onClick={() => handleFieldSelect('status', contactB.status, contactB.id)}
                            >
                                <Badge variant="outline" className="font-normal">{STATUS_LABELS[contactB.status]}</Badge>
                            </div>
                        </div>

                        {/* Primary Record Selection */}
                        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h5 className="text-sm font-semibold text-[#3D4A67] mb-2 flex items-center">
                                <Info className="h-4 w-4 mr-2" />
                                Which record should be the primary?
                            </h5>
                            <p className="text-xs text-slate-500 mb-4">
                                The primary record will preserve its ID. All tags and notes from both contacts will be combined.
                            </p>
                            <RadioGroup value={primaryId} onValueChange={setPrimaryId} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value={contactA.id} id="primary-a" />
                                    <Label htmlFor="primary-a" className="text-sm">Contact A</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value={contactB.id} id="primary-b" />
                                    <Label htmlFor="primary-b" className="text-sm">Contact B</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMerging}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleMerge}
                        disabled={isMerging}
                        className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white"
                    >
                        {isMerging ? "Merging..." : "Confirm Merge"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
