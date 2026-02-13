/**
 * Duplicate Detection API
 *
 * Finds potential duplicate contacts based on email, name, phone similarity
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface DuplicateGroup {
    reason: 'exact_email' | 'similar_name' | 'exact_phone' | 'fuzzy_match'
    score: number // 0-100, higher = more likely duplicate
    contacts: Array<{
        id: string
        name: string
        email?: string
        phone?: string
        company?: string
        createdAt: Date
    }>
}

/**
 * Calculate string similarity (Levenshtein distance)
 */
function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim()
    const s2 = str2.toLowerCase().trim()

    if (s1 === s2) return 100

    const len1 = s1.length
    const len2 = s2.length

    if (len1 === 0) return 0
    if (len2 === 0) return 0

    const matrix: number[][] = []

    for (let i = 0; i <= len2; i++) {
        matrix[i] = [i]
    }

    for (let j = 0; j <= len1; j++) {
        matrix[0][j] = j
    }

    for (let i = 1; i <= len2; i++) {
        for (let j = 1; j <= len1; j++) {
            if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                )
            }
        }
    }

    const distance = matrix[len2][len1]
    const maxLen = Math.max(len1, len2)
    return Math.round(((maxLen - distance) / maxLen) * 100)
}

/**
 * GET /api/contacts/duplicates
 * Find potential duplicate contacts in the organization
 */
export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        if (!profile?.tenant_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 400 })
        }

        // Fetch all contacts
        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('id, first_name, last_name, email, phone, company_name, is_company, created_at')
            .eq('tenant_id', profile.tenant_id)
            .order('created_at', { ascending: false })

        if (error) throw error

        if (!contacts || contacts.length === 0) {
            return NextResponse.json({ duplicates: [] })
        }

        // Find duplicates
        const duplicateGroups: DuplicateGroup[] = []
        const processedIds = new Set<string>()

        // 1. Exact email matches
        const emailMap = new Map<string, typeof contacts>()
        contacts.forEach((contact) => {
            if (contact.email) {
                const email = contact.email.toLowerCase().trim()
                if (!emailMap.has(email)) {
                    emailMap.set(email, [])
                }
                emailMap.get(email)!.push(contact)
            }
        })

        emailMap.forEach((group, email) => {
            if (group.length > 1) {
                duplicateGroups.push({
                    reason: 'exact_email',
                    score: 100,
                    contacts: group.map((c) => {
                        processedIds.add(c.id)
                        return {
                            id: c.id,
                            name: c.is_company
                                ? c.company_name || 'Unnamed'
                                : `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed',
                            email: c.email || undefined,
                            phone: c.phone || undefined,
                            company: c.is_company ? undefined : c.company_name || undefined,
                            createdAt: new Date(c.created_at),
                        }
                    }),
                })
            }
        })

        // 2. Exact phone matches (if both have phone)
        const phoneMap = new Map<string, typeof contacts>()
        contacts.forEach((contact) => {
            if (contact.phone && !processedIds.has(contact.id)) {
                const phone = contact.phone.replace(/\D/g, '') // Remove non-digits
                if (phone.length >= 9) {
                    // Only match if substantial phone number
                    if (!phoneMap.has(phone)) {
                        phoneMap.set(phone, [])
                    }
                    phoneMap.get(phone)!.push(contact)
                }
            }
        })

        phoneMap.forEach((group) => {
            if (group.length > 1) {
                duplicateGroups.push({
                    reason: 'exact_phone',
                    score: 95,
                    contacts: group.map((c) => {
                        processedIds.add(c.id)
                        return {
                            id: c.id,
                            name: c.is_company
                                ? c.company_name || 'Unnamed'
                                : `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed',
                            email: c.email || undefined,
                            phone: c.phone || undefined,
                            company: c.is_company ? undefined : c.company_name || undefined,
                            createdAt: new Date(c.created_at),
                        }
                    }),
                })
            }
        })

        // 3. Similar names (fuzzy matching)
        // Compare each contact with others, skip already processed
        const unprocessed = contacts.filter((c) => !processedIds.has(c.id))

        for (let i = 0; i < unprocessed.length; i++) {
            const contact1 = unprocessed[i]
            const name1 = contact1.is_company
                ? contact1.company_name || ''
                : `${contact1.first_name || ''} ${contact1.last_name || ''}`.trim()

            if (!name1) continue

            const similarContacts = [contact1]

            for (let j = i + 1; j < unprocessed.length; j++) {
                const contact2 = unprocessed[j]
                const name2 = contact2.is_company
                    ? contact2.company_name || ''
                    : `${contact2.first_name || ''} ${contact2.last_name || ''}`.trim()

                if (!name2) continue

                const similarity = calculateSimilarity(name1, name2)

                // If names are very similar (>85%), consider duplicates
                if (similarity >= 85) {
                    similarContacts.push(contact2)
                    processedIds.add(contact2.id)
                }
            }

            if (similarContacts.length > 1) {
                processedIds.add(contact1.id)
                duplicateGroups.push({
                    reason: 'similar_name',
                    score: 85,
                    contacts: similarContacts.map((c) => ({
                        id: c.id,
                        name: c.is_company
                            ? c.company_name || 'Unnamed'
                            : `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed',
                        email: c.email || undefined,
                        phone: c.phone || undefined,
                        company: c.is_company ? undefined : c.company_name || undefined,
                        createdAt: new Date(c.created_at),
                    })),
                })
            }
        }

        // Sort by score (highest first)
        duplicateGroups.sort((a, b) => b.score - a.score)

        return NextResponse.json({
            duplicates: duplicateGroups,
            total: duplicateGroups.length,
            contactsAffected: processedIds.size,
        })
    } catch (error: any) {
        console.error('Duplicate detection error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to detect duplicates' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/contacts/duplicates/merge
 * Merge multiple contacts into one
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { primaryId, duplicateIds, mergedData } = await req.json()

        if (!primaryId || !duplicateIds || duplicateIds.length === 0) {
            return NextResponse.json(
                { error: 'primaryId and duplicateIds are required' },
                { status: 400 }
            )
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        if (!profile?.tenant_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 400 })
        }

        // Verify all contacts belong to the user's org
        const { data: primaryContact } = await supabase
            .from('contacts')
            .select('tenant_id')
            .eq('id', primaryId)
            .single()

        if (!primaryContact || primaryContact.tenant_id !== profile.tenant_id) {
            return NextResponse.json({ error: 'Primary contact not found' }, { status: 404 })
        }

        // Update primary contact with merged data
        if (mergedData) {
            const { error: updateError } = await supabase
                .from('contacts')
                .update(mergedData)
                .eq('id', primaryId)

            if (updateError) throw updateError
        }

        // Delete duplicate contacts
        const { error: deleteError } = await supabase
            .from('contacts')
            .delete()
            .in('id', duplicateIds)
            .eq('tenant_id', profile.tenant_id)

        if (deleteError) throw deleteError

        return NextResponse.json({
            success: true,
            primaryId,
            mergedCount: duplicateIds.length,
        })
    } catch (error: any) {
        console.error('Merge contacts error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to merge contacts' },
            { status: 500 }
        )
    }
}
