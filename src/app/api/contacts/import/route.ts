import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateContacts, ImportContactInput } from '@/lib/validation/contact-import'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { contacts, columnMapping } = body

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: 'No contacts provided' },
        { status: 400 }
      )
    }

    // Transform contacts based on column mapping
    const mappedContacts = contacts.map((row: any) => {
      const mapped: any = {}
      Object.entries(columnMapping).forEach(([sourceCol, targetField]) => {
        if (targetField !== 'skip') {
          mapped[targetField as string] = row[sourceCol]
        }
      })
      return mapped
    })

    // Fetch existing emails to check for duplicates
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('email')
      .eq('tenant_id', profile.tenant_id)

    const existingEmails = new Set(
      (existingContacts || []).map(c => c.email?.toLowerCase()).filter(Boolean)
    )

    // Validate contacts
    const validationResult = validateContacts(mappedContacts, existingEmails)

    // If there are invalid contacts, return errors
    if (validationResult.invalid.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: {
          valid: validationResult.valid.length,
          invalid: validationResult.invalid.length,
          duplicates: validationResult.duplicates.length,
          errors: validationResult.invalid.map(inv => ({
            row: inv.row,
            errors: inv.errors.issues.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }))
        }
      }, { status: 400 })
    }

    // Prepare contacts for insertion
    const contactsToInsert = validationResult.valid.map((contact: ImportContactInput) => {
      return {
        tenant_id: profile.tenant_id,
        first_name: contact.firstName,
        last_name: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        company_name: contact.companyName,
        is_company: !contact.firstName && !!contact.companyName,
        status: contact.status,
        tags: contact.tags || [],
        notes: null,
      }
    })

    // Batch insert contacts (Supabase handles this efficiently)
    const { data: insertedContacts, error: insertError } = await supabase
      .from('contacts')
      .insert(contactsToInsert)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        {
          error: 'Failed to import contacts',
          details: insertError.message
        },
        { status: 500 }
      )
    }

    // Return success with statistics
    return NextResponse.json({
      success: true,
      imported: insertedContacts?.length || 0,
      skipped: validationResult.duplicates.length,
      duplicates: validationResult.duplicates.map(dup => ({
        row: dup.row,
        email: dup.email
      })),
      contacts: insertedContacts
    })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check for duplicates before import
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get emails from query params
    const { searchParams } = new URL(request.url)
    const emailsParam = searchParams.get('emails')

    if (!emailsParam) {
      return NextResponse.json({ duplicates: [] })
    }

    const emails = emailsParam.split(',').map(e => e.trim().toLowerCase())

    // Check for existing contacts
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('id, email, first_name, last_name')
      .eq('tenant_id', profile.tenant_id)
      .in('email', emails)

    return NextResponse.json({
      duplicates: existingContacts || []
    })

  } catch (error: any) {
    console.error('Duplicate check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
