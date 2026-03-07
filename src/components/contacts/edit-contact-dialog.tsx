'use client'

import { useEffect, useState } from 'react'
import { useContactStore } from '@/stores/contact-store'
import { Contact, ContactStatus, STATUS_LABELS } from '@/types/contact'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle } from 'lucide-react'
import { isValidEmail, isValidPhone, formatPhone } from '@/lib/validation/contact'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface EditContactDialogProps {
    contact: Contact
    open: boolean
    onOpenChange: (open: boolean) => void
}

function buildInitialForm(contact: Contact) {
    return {
        firstName: contact.firstName,
        lastName: contact.lastName,
        isCompany: contact.isCompany,
        companyName: contact.companyName || '',
        email: contact.email,
        phone: contact.phone || '',
        addressLine1: contact.addressLine1 || '',
        addressLine2: contact.addressLine2 || '',
        postalCode: contact.postalCode || '',
        city: contact.city || '',
        country: contact.country || '',
        status: contact.status,
    }
}

export function EditContactDialog({ contact, open, onOpenChange }: EditContactDialogProps) {
    const { updateContact, checkDuplicate } = useContactStore()
    const [isLoading, setIsLoading] = useState(false)
    const [emailError, setEmailError] = useState<string | null>(null)
    const [phoneError, setPhoneError] = useState<string | null>(null)
    const [isCheckingEmailDuplicate, setIsCheckingEmailDuplicate] = useState(false)
    const [isCheckingPhoneDuplicate, setIsCheckingPhoneDuplicate] = useState(false)
    const [formData, setFormData] = useState(() => buildInitialForm(contact))

    // Reset form to latest contact data whenever the dialog opens
    useEffect(() => {
        if (open) {
            setFormData(buildInitialForm(contact))
            setEmailError(null)
            setPhoneError(null)
        }
    }, [open, contact])

    const handleEmailBlur = async () => {
        const email = formData.email?.trim()
        if (!email || !isValidEmail(email)) {
            setEmailError(!email ? null : 'Invalid email format')
            return
        }

        setIsCheckingEmailDuplicate(true)
        const duplicate = await checkDuplicate(email, undefined, contact.id)
        setIsCheckingEmailDuplicate(false)

        if (duplicate) {
            setEmailError(`Contact already exists: ${duplicate.firstName} ${duplicate.lastName}`)
        } else {
            setEmailError(null)
        }
    }

    const handlePhoneBlur = async () => {
        const phone = formData.phone?.trim()
        if (!phone) {
            setPhoneError(null)
            return
        }

        if (isValidPhone(phone)) {
            const formatted = formatPhone(phone)
            setFormData(prev => ({ ...prev, phone: formatted }))
            setPhoneError(null)

            setIsCheckingPhoneDuplicate(true)
            const duplicate = await checkDuplicate(undefined, formatted, contact.id)
            setIsCheckingPhoneDuplicate(false)

            if (duplicate) {
                setPhoneError(`Phone already exists: ${duplicate.firstName} ${duplicate.lastName}`)
            }
        } else {
            setPhoneError('Invalid phone format for Switzerland')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.email || !isValidEmail(formData.email) || emailError || phoneError || isLoading || isCheckingEmailDuplicate || isCheckingPhoneDuplicate) return

        setIsLoading(true)
        try {
            await updateContact(contact.id, {
                firstName: formData.isCompany ? '' : formData.firstName,
                lastName: formData.isCompany ? '' : formData.lastName,
                isCompany: formData.isCompany,
                companyName: formData.companyName || undefined,
                email: formData.email,
                phone: formData.phone || undefined,
                status: formData.status,
                addressLine1: formData.addressLine1 || undefined,
                addressLine2: formData.addressLine2 || undefined,
                postalCode: formData.postalCode || undefined,
                city: formData.city || undefined,
                country: formData.country || undefined,
            })
            toast.success('Contact updated successfully')
            onOpenChange(false)
        } catch (err: unknown) {
            setEmailError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px] bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#3D4A67]">Edit Contact</DialogTitle>
                    <DialogDescription className="text-slate-600">
                        Update contact information
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Individual / Company toggle */}
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            type="button"
                            variant={formData.isCompany ? "outline" : "default"}
                            onClick={() => setFormData(prev => ({ ...prev, isCompany: false }))}
                            className={!formData.isCompany ? "bg-[#3D4A67] text-white" : ""}
                        >
                            Individual
                        </Button>
                        <Button
                            type="button"
                            variant={formData.isCompany ? "default" : "outline"}
                            onClick={() => setFormData(prev => ({ ...prev, isCompany: true }))}
                            className={formData.isCompany ? "bg-[#3D4A67] text-white" : ""}
                        >
                            Company
                        </Button>
                    </div>

                    {/* Name fields */}
                    {!formData.isCompany ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName" className="text-slate-700">First Name *</Label>
                                    <Input
                                        id="firstName"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                        placeholder="John"
                                        required={!formData.isCompany}
                                        className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName" className="text-slate-700">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                        placeholder="Doe"
                                        className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="companyName" className="text-slate-700">Company (Optional)</Label>
                                <Input
                                    id="companyName"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                                    placeholder="Acme Inc"
                                    className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="companyName" className="text-slate-700">Company Name *</Label>
                            <Input
                                id="companyName"
                                value={formData.companyName}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                                placeholder="Acme Inc"
                                required={formData.isCompany}
                                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    )}

                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-700">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => {
                                setFormData(prev => ({ ...prev, email: e.target.value }))
                                if (emailError) setEmailError(null)
                            }}
                            onBlur={handleEmailBlur}
                            placeholder="john@example.com"
                            required
                            className={`border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 ${emailError ? "border-red-500" : ""}`}
                        />
                        {isCheckingEmailDuplicate && <p className="text-[10px] text-slate-500 animate-pulse">Checking for duplicates...</p>}
                        {emailError && (
                            <Alert variant="destructive" className="py-2 px-3 mt-1">
                                <AlertCircle className="h-3 w-3" />
                                <AlertDescription className="text-[11px]">{emailError}</AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-slate-700">Phone</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => {
                                setFormData(prev => ({ ...prev, phone: e.target.value }))
                                if (phoneError) setPhoneError(null)
                            }}
                            onBlur={handlePhoneBlur}
                            placeholder="+41 79 123 4567"
                            className={`border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 ${phoneError ? "border-red-500" : ""}`}
                        />
                        {isCheckingPhoneDuplicate && <p className="text-[10px] text-slate-500 animate-pulse">Checking for duplicates...</p>}
                        {phoneError && (
                            <Alert variant="destructive" className="py-2 px-3 mt-1">
                                <AlertCircle className="h-3 w-3" />
                                <AlertDescription className="text-[11px]">{phoneError}</AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* Address */}
                    <div className="border-t border-slate-200 pt-4 space-y-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</p>

                        <div className="space-y-2">
                            <Label htmlFor="addressLine1" className="text-slate-700">Address Line 1</Label>
                            <Input
                                id="addressLine1"
                                value={formData.addressLine1}
                                onChange={(e) => setFormData(prev => ({ ...prev, addressLine1: e.target.value }))}
                                placeholder="123 Main Street"
                                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="addressLine2" className="text-slate-700">Address Line 2</Label>
                            <Input
                                id="addressLine2"
                                value={formData.addressLine2}
                                onChange={(e) => setFormData(prev => ({ ...prev, addressLine2: e.target.value }))}
                                placeholder="Apt 4B"
                                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="postalCode" className="text-slate-700">Postal Code</Label>
                                <Input
                                    id="postalCode"
                                    value={formData.postalCode}
                                    onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                                    placeholder="8001"
                                    className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city" className="text-slate-700">City</Label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                    placeholder="Zürich"
                                    className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="country" className="text-slate-700">Country</Label>
                            <Input
                                id="country"
                                value={formData.country}
                                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                                placeholder="Switzerland"
                                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                        <Label htmlFor="status" className="text-slate-700">Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as ContactStatus }))}
                        >
                            <SelectTrigger id="status" className="border-slate-300 bg-white text-slate-900">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="border-slate-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
