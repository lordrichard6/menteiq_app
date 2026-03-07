'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    // Check User Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single()

    revalidatePath('/', 'layout')

    // platform_admin and owner go to dashboard, member goes to portal
    if (profile?.role === 'owner' || profile?.role === 'platform_admin') {
        redirect('/dashboard')
    } else {
        redirect('/portal/dashboard')
    }
}

export async function signUp(formData: FormData) {
    const supabase = await createClient()

    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: 'owner',
            },
        },
    })

    if (error) {
        // Friendly message for duplicate email
        if (
            error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('user already exists')
        ) {
            return { error: 'An account with this email already exists. Try signing in instead.' }
        }
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    // Always redirect to verify-email — Supabase requires email confirmation by default
    redirect(`/verify-email?email=${encodeURIComponent(email)}`)
}

export async function resendConfirmation(email: string) {
    const supabase = await createClient()

    const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function signInWithGoogle() {
    const supabase = await createClient()
    const origin = (await headers()).get('origin')

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    })

    if (error) {
        return { error: error.message }
    }

    if (data.url) {
        redirect(data.url)
    }
}
