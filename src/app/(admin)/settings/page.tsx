'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { createClient } from '@/lib/supabase/client'
import {
    Loader2,
    Save,
    Building2,
    CreditCard,
    Receipt,
    UserCircle,
    Users,
    Upload,
    Crown,
    ExternalLink,
    AlertCircle,
} from 'lucide-react'
import { getSupportedCountries, TAX_RATES } from '@/lib/invoices/tax-rates'
import { toast } from 'sonner'
import { TokenUsageMeter } from '@/components/token-usage-meter'
import type { BillingSettings } from '@/lib/types/billing-settings'

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_BILLING: BillingSettings = {
    company_name: '',
    address_line1: '',
    address_line2: '',
    postal_code: '',
    city: '',
    country: 'CH',
    iban: '',
    bic: '',
    bank_name: '',
    vat_number: '',
    email: '',
    phone: '',
    default_currency: 'CHF',
    default_tax_rate: 8.1,
    invoice_prefix: 'INV',
}

interface TeamMember {
    id: string
    full_name: string | null
    email: string | null
    role: string
    avatar_url: string | null
    created_at: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string | null): string {
    if (name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) return email[0].toUpperCase()
    return '?'
}

/** Basic IBAN format check — accepts CH / LI / DE / AT / FR (2-letter country + 2 check digits + 8–30 alphanum) */
function isValidIBAN(iban: string): boolean {
    if (!iban) return true // Empty is OK (optional)
    const cleaned = iban.replace(/\s/g, '')
    return /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(cleaned)
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [orgId, setOrgId] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [billing, setBilling] = useState<BillingSettings>(DEFAULT_BILLING)
    const [profileName, setProfileName] = useState('')
    const [profileEmail, setProfileEmail] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [subscriptionTier, setSubscriptionTier] = useState<string>('free')
    const [portalLoading, setPortalLoading] = useState(false)

    // Dirty tracking
    const [isDirty, setIsDirty] = useState(false)
    const savedSnapshot = useRef<string>('')

    const supabase = createClient()
    const countries = getSupportedCountries()
    const avatarInputRef = useRef<HTMLInputElement>(null)

    // ── Load settings ───────────────────────────────────────────────────────

    const loadSettings = useCallback(async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            setUserId(user.id)

            // Profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, email, tenant_id, avatar_url')
                .eq('id', user.id)
                .single()

            if (!profile) return

            setProfileName(profile.full_name || '')
            setProfileEmail(profile.email || user.email || '')
            setAvatarUrl(profile.avatar_url)

            if (profile.tenant_id) {
                setOrgId(profile.tenant_id)

                // Organization
                const { data: org } = await supabase
                    .from('organizations')
                    .select('name, settings, subscription_tier')
                    .eq('id', profile.tenant_id)
                    .single()

                if (org) {
                    setSubscriptionTier(org.subscription_tier || 'free')

                    const settings = (org.settings as Record<string, unknown>) || {}
                    const billingRaw = (settings.billing as Record<string, unknown>) || {}

                    // Backward compat: migrate old "address" / "zip" field names
                    const billingSettings: BillingSettings = {
                        ...DEFAULT_BILLING,
                        ...(billingRaw as BillingSettings),
                    }
                    if (!billingSettings.address_line1 && billingRaw.address) {
                        billingSettings.address_line1 = billingRaw.address as string
                    }
                    if (!billingSettings.postal_code && billingRaw.zip) {
                        billingSettings.postal_code = billingRaw.zip as string
                    }

                    setBilling(billingSettings)
                }

                // Team members
                const { data: members } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, role, avatar_url, created_at')
                    .eq('tenant_id', profile.tenant_id)
                    .order('role', { ascending: true })
                    .order('created_at', { ascending: true })

                setTeamMembers(members || [])
            }

            // Snapshot for dirty tracking
            setTimeout(() => {
                savedSnapshot.current = buildSnapshot()
            }, 0)
        } catch (error) {
            console.error('Error loading settings:', error)
            toast.error('Failed to load settings')
        } finally {
            setLoading(false)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        loadSettings()
    }, [loadSettings])

    // ── Dirty tracking ──────────────────────────────────────────────────────

    const buildSnapshot = useCallback(() => {
        return JSON.stringify({ profileName, billing })
    }, [profileName, billing])

    useEffect(() => {
        if (!loading && savedSnapshot.current) {
            setIsDirty(buildSnapshot() !== savedSnapshot.current)
        }
    }, [profileName, billing, loading, buildSnapshot])

    // Warn on navigation with unsaved changes
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault()
            }
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [isDirty])

    // ── Save ────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!orgId || !userId) return

        // Validate IBAN
        if (billing.iban && !isValidIBAN(billing.iban)) {
            toast.error('Invalid IBAN format. Example: CH93 0076 2011 6238 5295 7')
            return
        }

        setSaving(true)
        try {
            // 1. Save profile name
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ full_name: profileName || null })
                .eq('id', userId)

            if (profileError) throw profileError

            // 2. Get current org settings and merge billing
            const { data: org } = await supabase
                .from('organizations')
                .select('settings')
                .eq('id', orgId)
                .single()

            const currentSettings = (org?.settings as Record<string, unknown>) || {}

            // Clean out legacy field names so we don't store both
            const cleanBilling = { ...billing }
            const cleanedSettings = {
                ...currentSettings,
                billing: cleanBilling,
            }
            // Remove legacy keys if they exist
            const billingObj = cleanedSettings.billing as Record<string, unknown>
            delete billingObj['address']
            delete billingObj['zip']

            const { error: orgError } = await supabase
                .from('organizations')
                .update({
                    name: billing.company_name || '',
                    settings: cleanedSettings,
                })
                .eq('id', orgId)

            if (orgError) throw orgError

            // Update snapshot
            savedSnapshot.current = buildSnapshot()
            setIsDirty(false)
            toast.success('Settings saved successfully')
        } catch (error: unknown) {
            console.error('Error saving settings:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    // ── Avatar upload ───────────────────────────────────────────────────────

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !userId) return

        // Validate file
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error('Please upload a JPEG, PNG, or WebP image')
            return
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be under 2 MB')
            return
        }

        setUploadingAvatar(true)
        try {
            const ext = file.name.split('.').pop() || 'jpg'
            const path = `${userId}/avatar.${ext}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(path, file, { upsert: true })

            if (uploadError) {
                // If bucket doesn't exist yet, show helpful message
                if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
                    toast.error('Avatar storage is not configured yet. Please run pending database migrations.')
                } else {
                    throw uploadError
                }
                return
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(path)

            // Cache-bust the URL
            const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: urlWithCacheBust })
                .eq('id', userId)

            if (updateError) throw updateError

            setAvatarUrl(urlWithCacheBust)
            toast.success('Avatar updated')
        } catch (error: unknown) {
            console.error('Avatar upload failed:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to upload avatar')
        } finally {
            setUploadingAvatar(false)
            // Reset file input
            if (avatarInputRef.current) avatarInputRef.current.value = ''
        }
    }

    // ── Stripe portal ───────────────────────────────────────────────────────

    const handleOpenPortal = async () => {
        setPortalLoading(true)
        try {
            const res = await fetch('/api/billing/portal', { method: 'POST' })
            if (!res.ok) {
                const text = await res.text()
                throw new Error(text)
            }
            const { url } = await res.json() as { url: string }
            window.open(url, '_blank')
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Failed to open billing portal'
            if (msg.includes('No active subscription')) {
                toast.error('No active subscription found. You are on the Free plan.')
            } else {
                toast.error(msg)
            }
        } finally {
            setPortalLoading(false)
        }
    }

    // ── Billing field updater ───────────────────────────────────────────────

    const updateBilling = (field: keyof BillingSettings, value: string | number) => {
        setBilling(prev => ({ ...prev, [field]: value }))
    }

    // ── Loading state ───────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#3D4A67]" />
                <span className="ml-2 text-slate-500">Loading settings...</span>
            </div>
        )
    }

    // ── JSX ─────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#3D4A67]">Settings</h1>
                    <p className="text-slate-600">Manage your account and organization</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                    className="bg-[#3D4A67] hover:bg-[#2D3A57]"
                >
                    {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Save All Settings
                </Button>
            </div>

            {isDirty && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    You have unsaved changes.
                </div>
            )}

            <div className="space-y-6">
                {/* ── Profile ──────────────────────────────────────────────── */}
                <Card className="border-slate-200 bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-3">
                        <UserCircle className="h-5 w-5 text-[#3D4A67]" />
                        <div>
                            <CardTitle className="text-[#3D4A67]">Profile</CardTitle>
                            <CardDescription className="text-slate-600">Your personal information</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-6">
                            {/* Avatar */}
                            <div className="relative group">
                                <Avatar className="h-20 w-20 border-2 border-slate-200">
                                    <AvatarImage src={avatarUrl || undefined} alt={profileName || 'Avatar'} />
                                    <AvatarFallback className="text-lg bg-[#3D4A67] text-white">
                                        {getInitials(profileName, profileEmail)}
                                    </AvatarFallback>
                                </Avatar>
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={uploadingAvatar}
                                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                    {uploadingAvatar ? (
                                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                                    ) : (
                                        <Upload className="h-5 w-5 text-white" />
                                    )}
                                </button>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                />
                            </div>

                            {/* Name + Email */}
                            <div className="grid grid-cols-2 gap-4 flex-1">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input
                                        value={profileName}
                                        onChange={e => setProfileName(e.target.value)}
                                        placeholder="Your name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        value={profileEmail}
                                        disabled
                                        className="bg-slate-50 text-slate-500"
                                    />
                                    <p className="text-xs text-slate-400">Managed through authentication provider</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Organization ─────────────────────────────────────────── */}
                <Card className="border-slate-200 bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-3">
                        <Building2 className="h-5 w-5 text-[#3D4A67]" />
                        <div>
                            <CardTitle className="text-[#3D4A67]">Organization</CardTitle>
                            <CardDescription className="text-slate-600">
                                Company details used on invoices and PDFs
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Company Name</Label>
                                <Input
                                    value={billing.company_name || ''}
                                    onChange={e => updateBilling('company_name', e.target.value)}
                                    placeholder="Your Company GmbH"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>VAT Number</Label>
                                <Input
                                    value={billing.vat_number || ''}
                                    onChange={e => updateBilling('vat_number', e.target.value)}
                                    placeholder="CHE-123.456.789 MWST"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Address Line 1</Label>
                                <Input
                                    value={billing.address_line1 || ''}
                                    onChange={e => updateBilling('address_line1', e.target.value)}
                                    placeholder="Street and number"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Address Line 2 (optional)</Label>
                                <Input
                                    value={billing.address_line2 || ''}
                                    onChange={e => updateBilling('address_line2', e.target.value)}
                                    placeholder="Apartment, suite, floor"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>ZIP / Postal Code</Label>
                                <Input
                                    value={billing.postal_code || ''}
                                    onChange={e => updateBilling('postal_code', e.target.value)}
                                    placeholder="8000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>City</Label>
                                <Input
                                    value={billing.city || ''}
                                    onChange={e => updateBilling('city', e.target.value)}
                                    placeholder="Zurich"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Country</Label>
                                <Select value={billing.country || 'CH'} onValueChange={v => updateBilling('country', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countries.map(code => (
                                            <SelectItem key={code} value={code}>
                                                {TAX_RATES[code]?.name || code}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Business Email</Label>
                                <Input
                                    type="email"
                                    value={billing.email || ''}
                                    onChange={e => updateBilling('email', e.target.value)}
                                    placeholder="invoices@company.ch"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input
                                    value={billing.phone || ''}
                                    onChange={e => updateBilling('phone', e.target.value)}
                                    placeholder="+41 44 123 45 67"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Bank Details ─────────────────────────────────────────── */}
                <Card className="border-slate-200 bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-3">
                        <CreditCard className="h-5 w-5 text-[#3D4A67]" />
                        <div>
                            <CardTitle className="text-[#3D4A67]">Bank Details</CardTitle>
                            <CardDescription className="text-slate-600">
                                Payment information for invoices and QR-Bills
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>IBAN</Label>
                            <Input
                                value={billing.iban || ''}
                                onChange={e => updateBilling('iban', e.target.value.toUpperCase())}
                                placeholder="CH93 0076 2011 6238 5295 7"
                                className={`font-mono ${billing.iban && !isValidIBAN(billing.iban) ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                            />
                            {billing.iban && !isValidIBAN(billing.iban) ? (
                                <p className="text-xs text-red-500">
                                    Invalid IBAN format. Example: CH93 0076 2011 6238 5295 7
                                </p>
                            ) : (
                                <p className="text-xs text-slate-500">
                                    Used for Swiss QR-Bills and EU SEPA invoices
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>BIC / SWIFT (optional)</Label>
                                <Input
                                    value={billing.bic || ''}
                                    onChange={e => updateBilling('bic', e.target.value.toUpperCase())}
                                    placeholder="ZKBKCHZZ80A"
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Bank Name (optional)</Label>
                                <Input
                                    value={billing.bank_name || ''}
                                    onChange={e => updateBilling('bank_name', e.target.value)}
                                    placeholder="Zuercher Kantonalbank"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Invoice Preferences ──────────────────────────────────── */}
                <Card className="border-slate-200 bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-3">
                        <Receipt className="h-5 w-5 text-[#3D4A67]" />
                        <div>
                            <CardTitle className="text-[#3D4A67]">Invoice Preferences</CardTitle>
                            <CardDescription className="text-slate-600">
                                Default settings applied when creating new invoices
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Invoice Number Prefix</Label>
                                <Input
                                    value={billing.invoice_prefix || ''}
                                    onChange={e => updateBilling('invoice_prefix', e.target.value)}
                                    placeholder="INV"
                                    maxLength={10}
                                />
                                <p className="text-xs text-slate-500">
                                    e.g., {billing.invoice_prefix || 'INV'}-2026-0001
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Default Currency</Label>
                                <Select
                                    value={billing.default_currency || 'CHF'}
                                    onValueChange={v => updateBilling('default_currency', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Default Tax Rate</Label>
                                <Select
                                    value={(billing.default_tax_rate ?? 8.1).toString()}
                                    onValueChange={v => updateBilling('default_tax_rate', parseFloat(v))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">0% (Exempt)</SelectItem>
                                        <SelectItem value="2.6">2.6% (CH Reduced)</SelectItem>
                                        <SelectItem value="8.1">8.1% (CH Standard)</SelectItem>
                                        <SelectItem value="7">7% (DE Reduced)</SelectItem>
                                        <SelectItem value="19">19% (DE Standard)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Subscription & Usage ─────────────────────────────────── */}
                <Card className="border-slate-200 bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-3">
                        <Crown className="h-5 w-5 text-[#3D4A67]" />
                        <div>
                            <CardTitle className="text-[#3D4A67]">Subscription & Usage</CardTitle>
                            <CardDescription className="text-slate-600">
                                Your current plan and AI token usage
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left: plan info */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-500">Current Plan</span>
                                    <Badge className="bg-[#3D4A67] text-white capitalize">
                                        {subscriptionTier}
                                    </Badge>
                                </div>

                                {subscriptionTier !== 'free' && (
                                    <Button
                                        variant="outline"
                                        onClick={handleOpenPortal}
                                        disabled={portalLoading}
                                        className="border-slate-300"
                                    >
                                        {portalLoading ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                        )}
                                        Manage Subscription
                                    </Button>
                                )}

                                {subscriptionTier === 'free' && (
                                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
                                        <p className="font-medium mb-1">Free Plan</p>
                                        <p className="text-xs text-slate-500">
                                            Upgrade to Pro for 50x more AI tokens, GPT-4o, Claude, and more.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Right: token meter */}
                            <TokenUsageMeter />
                        </div>
                    </CardContent>
                </Card>

                {/* ── Team Members ─────────────────────────────────────────── */}
                <Card className="border-slate-200 bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-3">
                        <Users className="h-5 w-5 text-[#3D4A67]" />
                        <div>
                            <CardTitle className="text-[#3D4A67]">Team</CardTitle>
                            <CardDescription className="text-slate-600">
                                Members in your organization
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {teamMembers.length === 0 ? (
                            <p className="text-sm text-slate-500 py-4 text-center">No team members found.</p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {teamMembers.map(member => (
                                    <div key={member.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={member.avatar_url || undefined} />
                                            <AvatarFallback className="bg-slate-200 text-slate-600 text-sm">
                                                {getInitials(member.full_name, member.email)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate">
                                                {member.full_name || 'Unnamed'}
                                                {member.id === userId && (
                                                    <span className="text-xs text-slate-400 ml-2">(you)</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">{member.email}</p>
                                        </div>
                                        <Badge variant="outline" className="capitalize shrink-0">
                                            {member.role}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Bottom save button ───────────────────────────────────── */}
                <div className="flex justify-end pb-8">
                    <Button
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        className="bg-[#3D4A67] hover:bg-[#2D3A57]"
                    >
                        {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save All Settings
                    </Button>
                </div>
            </div>
        </div>
    )
}
