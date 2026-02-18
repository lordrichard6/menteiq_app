'use client'

/**
 * GDPR Cookie Consent Banner
 *
 * Stores consent in localStorage under 'cookie_consent'.
 * Values: 'accepted' | 'declined' | null (not yet decided)
 *
 * For a production setup with analytics, check the stored value before
 * initialising any tracking scripts (e.g. Plausible, Sentry).
 */

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const CONSENT_KEY = 'cookie_consent'

type ConsentValue = 'accepted' | 'declined'

export function useCookieConsent() {
  const [consent, setConsentState] = useState<ConsentValue | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as ConsentValue | null
    setConsentState(stored)
  }, [])

  const setConsent = (value: ConsentValue) => {
    localStorage.setItem(CONSENT_KEY, value)
    setConsentState(value)
  }

  return { consent, setConsent }
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)
  const { consent, setConsent } = useCookieConsent()

  useEffect(() => {
    // Show banner only if user hasn't decided yet
    if (consent === null) setVisible(true)
    else setVisible(false)
  }, [consent])

  if (!visible) return null

  const handleAccept = () => {
    setConsent('accepted')
    setVisible(false)
  }

  const handleDecline = () => {
    setConsent('declined')
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:bottom-6 sm:left-6 sm:right-auto sm:p-5"
    >
      <div className="flex items-start gap-3">
        {/* Cookie icon */}
        <span className="mt-0.5 text-xl" aria-hidden="true">🍪</span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            We use cookies
          </p>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            We use essential cookies to keep you logged in and make the app
            work. We do not use tracking or advertising cookies.{' '}
            <a
              href="/privacy"
              className="underline underline-offset-2 hover:text-slate-700 transition-colors"
            >
              Privacy Policy
            </a>
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleAccept}
              className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white h-8 px-4 text-xs"
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDecline}
              className="h-8 px-4 text-xs border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              Decline
            </Button>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDecline}
          aria-label="Close cookie banner"
          className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 mt-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
