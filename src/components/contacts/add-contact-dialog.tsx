'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useContactStore } from '@/stores/contact-store'
import { ContactStatus, STATUS_LABELS } from '@/types/contact'
import { UserPlus, Loader2, AlertCircle } from 'lucide-react'
import { emailRegex, isValidEmail, isValidPhone, formatPhone } from '@/lib/validation/contact'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Phone } from 'lucide-react'

export function AddContactDialog() {
    const [open, setOpen] = useState(false)
    const [isCompany, setIsCompany] = useState(false)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [status, setStatus] = useState<ContactStatus>('lead')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [emailError, setEmailError] = useState<string | null>(null)
    const [phoneError, setPhoneError] = useState<string | null>(null)
    const [isCheckingEmail, setIsCheckingEmail] = useState(false)

    const addContact = useContactStore((state) => state.addContact)
    const checkDuplicate = useContactStore((state) => state.checkDuplicate)

    const handleEmailBlur = async () => {
        if (!email || !isValidEmail(email)) {
            setEmailError(!email ? null : 'Invalid email format')
            return
        }

        setIsCheckingEmail(true)
        const duplicate = await checkDuplicate(email, undefined)
        setIsCheckingEmail(false)

        if (duplicate) {
            setEmailError(`Contact already exists: ${duplicate.firstName} ${duplicate.lastName}`)
        } else {
            setEmailError(null)
        }
    }

    const handlePhoneBlur = async () => {
        if (!phone) {
            setPhoneError(null)
            return
        }

        if (isValidPhone(phone)) {
            const formatted = formatPhone(phone)
            setPhone(formatted)
            setPhoneError(null)

            setIsCheckingEmail(true) // Reuse checking state for simplicity
            const duplicate = await checkDuplicate(undefined, formatted)
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
        if (isCompany && !companyName) return
        if (!isCompany && !firstName) return
        if (!email || !isValidEmail(email) || emailError || isSubmitting) return

        setIsSubmitting(true)
        try {
            const result = await addContact({
                firstName: isCompany ? '' : firstName,
                lastName: isCompany ? '' : lastName,
                isCompany,
                companyName: companyName || undefined,
                email,
                phone: phone || undefined,
                status,
            })

            if (result) {
                // Reset form
                setIsCompany(false)
                setFirstName('')
                setLastName('')
                setCompanyName('')
                setEmail('')
                setPhone('')
                setStatus('lead')
                setOpen(false)
            }
        } catch (err: any) {
            setEmailError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Contact
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-[#3D4A67]">Add New Contact</DialogTitle>
                        <DialogDescription>
                            Enter the contact details below. Click save when you&apos;re done.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                type="button"
                                variant={isCompany ? "outline" : "default"}
                                onClick={() => setIsCompany(false)}
                                className={!isCompany ? "bg-[#3D4A67] text-white" : ""}
                            >
                                Individual
                            </Button>
                            <Button
                                type="button"
                                variant={isCompany ? "default" : "outline"}
                                onClick={() => setIsCompany(true)}
                                className={isCompany ? "bg-[#3D4A67] text-white" : ""}
                            >
                                Company
                            </Button>
                        </div>

                        {!isCompany ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="firstName">First Name *</Label>
                                        <Input
                                            id="firstName"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="John"
                                            required={!isCompany}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="companyName">Company (Optional)</Label>
                                    <Input
                                        id="companyName"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Acme Inc"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="companyName">Company Name *</Label>
                                <Input
                                    id="companyName"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="Acme Inc"
                                    required={isCompany}
                                />
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value)
                                    if (phoneError) setPhoneError(null)
                                }}
                                onBlur={handlePhoneBlur}
                                placeholder="+41 79 123 4567"
                                className={phoneError ? "border-red-500" : ""}
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
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    if (emailError) setEmailError(null)
                                }}
                                onBlur={handleEmailBlur}
                                placeholder="john@example.com"
                                required
                                className={emailError ? "border-red-500" : ""}
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
                        <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as ContactStatus)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-[#3D4A67] hover:bg-[#2D3A57]" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Contact'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
