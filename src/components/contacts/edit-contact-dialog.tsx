'use client'

import { useState } from 'react'
import { useContactStore } from '@/stores/contact-store'
import { Contact } from '@/types/contact'
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
import { Loader2, AlertCircle, Phone } from 'lucide-react'
import { isValidEmail, isValidPhone, formatPhone } from '@/lib/validation/contact'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EditContactDialogProps {
    contact: Contact
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditContactDialog({ contact, open, onOpenChange }: EditContactDialogProps) {
    const { updateContact, checkDuplicate } = useContactStore()
    const [isLoading, setIsLoading] = useState(false)
    const [emailError, setEmailError] = useState<string | null>(null)
    const [phoneError, setPhoneError] = useState<string | null>(null)
    const [isCheckingEmail, setIsCheckingEmail] = useState(false)
    const [formData, setFormData] = useState({
        firstName: contact.firstName,
        lastName: contact.lastName,
        isCompany: contact.isCompany,
        companyName: contact.companyName || '',
        email: contact.email,
        phone: contact.phone || '',
    })

    const handleEmailBlur = async () => {
        const email = formData.email?.trim()
        if (!email || !isValidEmail(email)) {
            setEmailError(!email ? null : 'Invalid email format')
            return
        }

        setIsCheckingEmail(true)
        const duplicate = await checkDuplicate(email, undefined, contact.id)
        setIsCheckingEmail(false)

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
            setFormData({ ...formData, phone: formatted })
            setPhoneError(null)

            setIsCheckingEmail(true)
            const duplicate = await checkDuplicate(undefined, formatted, contact.id)
            setIsCheckingEmail(false)

            if (duplicate) {
                setPhoneError(`Phone already exists: ${duplicate.firstName} ${duplicate.lastName}`)
            }
        } else {
            setPhoneError('Invalid phone format for Switzerland')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.email || !isValidEmail(formData.email) || emailError || phoneError || isLoading) return

        setIsLoading(true)
        try {
            await updateContact(contact.id, {
                firstName: formData.isCompany ? '' : formData.firstName,
                lastName: formData.isCompany ? '' : formData.lastName,
                isCompany: formData.isCompany,
                companyName: formData.companyName || undefined,
                email: formData.email,
                phone: formData.phone || undefined,
            })
            onOpenChange(false)
        } catch (err: any) {
            setEmailError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-white">
                <DialogHeader>
                    <DialogTitle className="text-[#3D4A67]">Edit Contact</DialogTitle>
                    <DialogDescription className="text-slate-600">
                        Update contact information
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            type="button"
                            variant={formData.isCompany ? "outline" : "default"}
                            onClick={() => setFormData({ ...formData, isCompany: false })}
                            className={!formData.isCompany ? "bg-[#3D4A67] text-white" : ""}
                        >
                            Individual
                        </Button>
                        <Button
                            type="button"
                            variant={formData.isCompany ? "default" : "outline"}
                            onClick={() => setFormData({ ...formData, isCompany: true })}
                            className={formData.isCompany ? "bg-[#3D4A67] text-white" : ""}
                        >
                            Company
                        </Button>
                    </div>

                    {!formData.isCompany ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName" className="text-slate-700">First Name *</Label>
                                    <Input
                                        id="firstName"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
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
                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                placeholder="Acme Inc"
                                required={formData.isCompany}
                                className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-700">
                            Email *
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => {
                                setFormData({ ...formData, email: e.target.value })
                                if (emailError) setEmailError(null)
                            }}
                            onBlur={handleEmailBlur}
                            placeholder="john@example.com"
                            required
                            className={`border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 ${emailError ? "border-red-500" : ""}`}
                        />
                        {isCheckingEmail && <p className="text-[10px] text-slate-500 animate-pulse">Checking for duplicates...</p>}
                        {emailError && (
                            <Alert variant="destructive" className="py-2 px-3 mt-1">
                                <AlertCircle className="h-3 w-3" />
                                <AlertDescription className="text-[11px]">
                                    {emailError}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-slate-700">
                            Phone
                        </Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => {
                                setFormData({ ...formData, phone: e.target.value })
                                if (phoneError) setPhoneError(null)
                            }}
                            onBlur={handlePhoneBlur}
                            placeholder="+41 79 123 4567"
                            className={`border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 ${phoneError ? "border-red-500" : ""}`}
                        />
                        {phoneError && (
                            <Alert variant="destructive" className="py-2 px-3 mt-1">
                                <AlertCircle className="h-3 w-3" />
                                <AlertDescription className="text-[11px]">
                                    {phoneError}
                                </AlertDescription>
                            </Alert>
                        )}
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
