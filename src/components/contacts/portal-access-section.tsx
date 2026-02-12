'use client'

import { useState } from 'react'
import { Contact } from '@/types/contact'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  ExternalLink,
  Mail,
  Copy,
  Check,
  Clock,
  Shield,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface PortalAccessSectionProps {
  contact: Contact
}

export function PortalAccessSection({ contact }: PortalAccessSectionProps) {
  const [portalEnabled, setPortalEnabled] = useState(
    contact.portal_enabled || false
  )
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [isTogglingPortal, setIsTogglingPortal] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate portal URL (will be dynamic based on contact's portal_token)
  const portalUrl = contact.portal_token
    ? `${window.location.origin}/portal/auth/${contact.portal_token}`
    : null

  const handleTogglePortal = async () => {
    setIsTogglingPortal(true)

    try {
      const response = await fetch('/api/portal/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          enabled: !portalEnabled,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle portal access')
      }

      const data = await response.json()
      setPortalEnabled(data.portal_enabled)

      toast.success(
        data.portal_enabled
          ? 'Portal access enabled'
          : 'Portal access disabled'
      )
    } catch (error) {
      console.error('Failed to toggle portal:', error)
      toast.error('Failed to update portal access')
    } finally {
      setIsTogglingPortal(false)
    }
  }

  const handleSendInvitation = async () => {
    if (!contact.email) {
      toast.error('Contact has no email address')
      return
    }

    setIsSendingInvite(true)

    try {
      const response = await fetch('/api/portal/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to send invitation')
      }

      toast.success(`Portal invitation sent to ${contact.email}`)
    } catch (error) {
      console.error('Failed to send invitation:', error)
      toast.error('Failed to send invitation')
    } finally {
      setIsSendingInvite(false)
    }
  }

  const handleCopyPortalLink = () => {
    if (portalUrl) {
      navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      toast.success('Portal link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#3D4A67]">Client Portal Access</CardTitle>
          <Badge
            variant={portalEnabled ? 'default' : 'secondary'}
            className={
              portalEnabled
                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                : 'bg-slate-100 text-slate-600'
            }
          >
            <Shield className="h-3 w-3 mr-1" />
            {portalEnabled ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle Portal Access */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Enable Portal Access
            </p>
            <p className="text-xs text-slate-500">
              Allow this contact to access their portal
            </p>
          </div>
          <Switch
            checked={portalEnabled}
            onCheckedChange={handleTogglePortal}
            disabled={isTogglingPortal}
          />
        </div>

        {/* Portal Actions (only show if enabled) */}
        {portalEnabled && (
          <>
            <div className="border-t border-slate-100 pt-4 space-y-3">
              {/* Send Invitation Button */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleSendInvitation}
                  disabled={isSendingInvite || !contact.email}
                  className="flex-1 bg-[#3D4A67] hover:bg-[#2D3A57] text-white"
                >
                  {isSendingInvite ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>

                {/* Copy Portal Link */}
                {portalUrl && (
                  <Button
                    onClick={handleCopyPortalLink}
                    variant="outline"
                    className="flex-1 border-slate-300"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Portal Link Preview */}
              {portalUrl && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-start gap-2">
                    <ExternalLink className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-600 mb-1">
                        Portal URL
                      </p>
                      <p className="text-xs text-slate-500 truncate font-mono">
                        {portalUrl}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Activity */}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {contact.portal_invited_at && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span>
                      Invited{' '}
                      {formatDistanceToNow(new Date(contact.portal_invited_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}
                {contact.last_portal_login && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      Last login{' '}
                      {formatDistanceToNow(new Date(contact.last_portal_login), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Help Text */}
        {!contact.email && portalEnabled && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              ⚠️ This contact has no email address. Add an email to send portal
              invitations.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
