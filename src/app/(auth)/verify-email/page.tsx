'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { Mail, RefreshCw, ShieldCheck, Globe } from 'lucide-react'
import { resendConfirmation } from "../actions"
import { useSearchParams } from "next/navigation"
import { useState, Suspense } from "react"

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const email = searchParams.get('email') || ''
    const [resendState, setResendState] = useState<{ success?: boolean; error?: string } | null>(null)
    const [resending, setResending] = useState(false)

    const handleResend = async () => {
        if (!email) return
        setResending(true)
        setResendState(null)
        const result = await resendConfirmation(email)
        setResendState(result || { success: true })
        setResending(false)
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-8">

            {/* Logo */}
            <div className="mb-6 flex flex-col items-center gap-2">
                <Image src="/menteiq_logo.svg" alt="MenteIQ" width={120} height={32} priority />
            </div>

            <Card className="w-full max-w-md border-slate-200 bg-white shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                        <Mail className="h-8 w-8 text-[#3D4A67]" />
                    </div>
                    <CardTitle className="text-2xl text-[#3D4A67]">Check your email</CardTitle>
                    <CardDescription className="text-slate-600 mt-2">
                        We sent a confirmation link to<br />
                        <span className="font-semibold text-slate-800">{email}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-slate-500 text-center">
                        Click the link in the email to activate your account.
                        If you don&apos;t see it, check your spam folder.
                    </p>

                    {resendState?.error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md text-center">
                            {resendState.error}
                        </div>
                    )}
                    {resendState?.success && (
                        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md text-center">
                            Confirmation email resent — check your inbox.
                        </div>
                    )}

                    <Button
                        variant="outline"
                        className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 gap-2"
                        onClick={handleResend}
                        disabled={resending || !email}
                    >
                        <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
                        {resending ? 'Resending…' : 'Resend confirmation email'}
                    </Button>

                    <p className="text-center text-sm text-slate-500">
                        Wrong email?{' '}
                        <Link href="/signup" className="text-[#3D4A67] hover:underline font-medium">
                            Sign up again
                        </Link>
                        {' · '}
                        <Link href="/login" className="text-[#3D4A67] hover:underline font-medium">
                            Sign in
                        </Link>
                    </p>
                </CardContent>
            </Card>

            {/* Trust badges */}
            <div className="mt-6 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-1.5 shadow-sm">
                    <span className="text-base">🇨🇭</span>
                    <span className="text-xs font-semibold text-slate-600 tracking-wide">Swiss-Made Software</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2.5 py-1">
                        <ShieldCheck className="h-3 w-3 text-[#9EAE8E]" /> GDPR Compliant
                    </span>
                    <span className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2.5 py-1">
                        <Globe className="h-3 w-3 text-[#9EAE8E]" /> Built for Europe
                    </span>
                </div>
                <p className="text-xs text-slate-400 text-center">
                    MenteIQ is a product of{' '}
                    <a href="https://lopes2tech.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 underline underline-offset-2">
                        Lopes2tech
                    </a>
                    {' '}· © 2026 All rights reserved
                </p>
            </div>

        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
            <VerifyEmailContent />
        </Suspense>
    )
}
