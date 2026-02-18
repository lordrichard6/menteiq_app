'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'
import { Shield, Check, X, Clock, History } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ConsentManagementProps {
    contactId: string
    currentConsent?: {
        marketing_consent?: boolean
        data_processing_consent?: boolean
        consent_date?: string
        privacy_policy_version?: string
    }
}

interface ConsentHistoryEntry {
    id: string
    consent_type: string
    consent_given: boolean
    consent_date: string
    privacy_policy_version?: string
    notes?: string
}

export function ConsentManagement({ contactId, currentConsent }: ConsentManagementProps) {
    const [marketingConsent, setMarketingConsent] = useState(currentConsent?.marketing_consent || false)
    const [dataProcessingConsent, setDataProcessingConsent] = useState<boolean>(currentConsent?.data_processing_consent ?? true)
    const [isSaving, setIsSaving] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [consentHistory, setConsentHistory] = useState<ConsentHistoryEntry[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    useEffect(() => {
        if (currentConsent) {
            setMarketingConsent(currentConsent.marketing_consent || false)
            setDataProcessingConsent(currentConsent.data_processing_consent !== false) // Default to true
        }
    }, [currentConsent])

    const loadConsentHistory = async () => {
        setLoadingHistory(true)
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('consent_history')
                .select('*')
                .eq('contact_id', contactId)
                .order('created_at', { ascending: false })
                .limit(20)

            if (error) throw error
            setConsentHistory(data || [])
        } catch (error) {
            console.error('Failed to load consent history:', error)
        } finally {
            setLoadingHistory(false)
        }
    }

    const handleSaveConsent = async () => {
        setIsSaving(true)
        try {
            const supabase = createClient()

            // Update contact consent fields
            const { error } = await supabase
                .from('contacts')
                .update({
                    marketing_consent: marketingConsent,
                    data_processing_consent: dataProcessingConsent,
                    consent_date: new Date().toISOString(),
                    privacy_policy_version: '1.0', // You can make this dynamic
                })
                .eq('id', contactId)

            if (error) throw error

            // Record in consent history
            await supabase.rpc('record_consent_change', {
                p_contact_id: contactId,
                p_consent_type: 'both',
                p_consent_given: marketingConsent && dataProcessingConsent,
                p_privacy_policy_version: '1.0',
                p_notes: 'Updated via admin panel',
            })

            alert('Consent preferences updated successfully')

            // Reload history if it's showing
            if (showHistory) {
                loadConsentHistory()
            }
        } catch (error) {
            console.error('Failed to update consent:', error)
            alert('Failed to update consent preferences')
        } finally {
            setIsSaving(false)
        }
    }

    const handleToggleHistory = () => {
        if (!showHistory && consentHistory.length === 0) {
            loadConsentHistory()
        }
        setShowHistory(!showHistory)
    }

    return (
        <Card className="border-slate-200 bg-white">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-[#3D4A67]" />
                        <CardTitle className="text-[#3D4A67]">Privacy & Consent</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                        GDPR Compliant
                    </Badge>
                </div>
                <CardDescription>
                    Manage data processing and marketing consent preferences
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Current Consent Status */}
                <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <Checkbox
                            id="data-processing"
                            checked={dataProcessingConsent}
                            onCheckedChange={(checked) => setDataProcessingConsent(checked as boolean)}
                            className="mt-0.5"
                        />
                        <div className="flex-1">
                            <label
                                htmlFor="data-processing"
                                className="text-sm font-medium text-slate-900 cursor-pointer flex items-center gap-2"
                            >
                                Data Processing Consent
                                {dataProcessingConsent && <Check className="h-4 w-4 text-green-600" />}
                            </label>
                            <p className="text-xs text-slate-600 mt-1">
                                Consent to process personal data for providing services. This is typically required
                                for maintaining the business relationship.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <Checkbox
                            id="marketing"
                            checked={marketingConsent}
                            onCheckedChange={(checked) => setMarketingConsent(checked as boolean)}
                            className="mt-0.5"
                        />
                        <div className="flex-1">
                            <label
                                htmlFor="marketing"
                                className="text-sm font-medium text-slate-900 cursor-pointer flex items-center gap-2"
                            >
                                Marketing Communications Consent
                                {marketingConsent ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <X className="h-4 w-4 text-slate-400" />
                                )}
                            </label>
                            <p className="text-xs text-slate-600 mt-1">
                                Consent to receive marketing emails, newsletters, and promotional content.
                                Can be revoked at any time.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Consent Metadata */}
                {currentConsent?.consent_date && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-200">
                        <Clock className="h-3 w-3" />
                        Last updated: {formatDistanceToNow(new Date(currentConsent.consent_date), { addSuffix: true })}
                        {currentConsent.privacy_policy_version && (
                            <span className="ml-2">• Policy v{currentConsent.privacy_policy_version}</span>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                    <Button
                        onClick={handleSaveConsent}
                        disabled={isSaving}
                        className="bg-[#3D4A67] hover:bg-[#2D3A57]"
                    >
                        {isSaving ? 'Saving...' : 'Save Consent Preferences'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleToggleHistory}
                        className="border-slate-300"
                    >
                        <History className="h-4 w-4 mr-2" />
                        {showHistory ? 'Hide' : 'View'} History
                    </Button>
                </div>

                {/* Consent History */}
                {showHistory && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <h4 className="text-sm font-medium text-slate-900 mb-3">Consent History</h4>
                        {loadingHistory ? (
                            <p className="text-sm text-slate-500">Loading history...</p>
                        ) : consentHistory.length === 0 ? (
                            <p className="text-sm text-slate-500">No consent history recorded yet.</p>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {consentHistory.map((entry) => (
                                    <div key={entry.id} className="flex items-start gap-3 p-2 bg-slate-50 rounded text-xs">
                                        <div
                                            className={`p-1 rounded-full ${
                                                entry.consent_given ? 'bg-green-100' : 'bg-red-100'
                                            }`}
                                        >
                                            {entry.consent_given ? (
                                                <Check className="h-3 w-3 text-green-600" />
                                            ) : (
                                                <X className="h-3 w-3 text-red-600" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-slate-900">
                                                {entry.consent_type === 'both' ? 'All Consents' : entry.consent_type}:{' '}
                                                {entry.consent_given ? 'Granted' : 'Revoked'}
                                            </div>
                                            <div className="text-slate-600">
                                                {formatDistanceToNow(new Date(entry.consent_date), { addSuffix: true })}
                                            </div>
                                            {entry.notes && (
                                                <div className="text-slate-500 mt-1">{entry.notes}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
