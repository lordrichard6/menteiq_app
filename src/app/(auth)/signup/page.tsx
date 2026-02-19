'use client';

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Mail, Lock, ArrowRight, User } from 'lucide-react'
import { signUp, signInWithGoogle } from "../actions"
import { useActionState } from "react"

export default function SignupPage() {
    const [state, formAction, isPending] = useActionState(async (_prev: any, formData: FormData) => {
        const res = await signUp(formData);
        if (res?.error) return { error: res.error };
        return null;
    }, null);

    const handleGoogleSignIn = async () => {
        const res = await signInWithGoogle();
        if (res?.error) {
            // If there's an error, we stay on the page
            console.error('Google sign-in error:', res.error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <Card className="w-full max-w-md border-slate-200 bg-white shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-[#3D4A67]">Create your account</CardTitle>
                    <CardDescription className="text-slate-600">
                        Get started with MenteIQ
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form action={formAction} className="space-y-4">
                        {state?.error && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
                                {state.error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    placeholder="John Doe"
                                    required
                                    className="pl-10 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-slate-700">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    required
                                    className="pl-10 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-slate-700">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    className="pl-10 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        <Button type="submit" disabled={isPending} className="w-full bg-[#3D4A67] hover:bg-[#2D3A57] text-white gap-2">
                            {isPending ? 'Creating account...' : 'Create Account'}
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-white px-2 text-slate-500">or continue with</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                        onClick={handleGoogleSignIn}
                    >
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign up with Google
                    </Button>

                    <p className="text-center text-sm text-slate-500">
                        Already have an account?{' '}
                        <Link href="/login" className="text-[#3D4A67] hover:underline font-medium">
                            Sign in
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
