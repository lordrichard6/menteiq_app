import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'
import ExcelJS from 'exceljs'

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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json(
        {
          error: 'Organization not found',
          details: 'Your user profile is not linked to an organization. Please try logging out and back in, or contact support.'
        },
        { status: 404 }
      )
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const fieldsParam = searchParams.get('fields') || 'name,email,phone,company,status,tags'
    const fields = fieldsParam.split(',')

    // Fetch all contacts for this organization
    const { data: contacts, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      )
    }

    // If no contacts, we'll still proceed to generate a file with headers only
    const hasContacts = contacts && contacts.length > 0;

    // Transform contacts based on selected fields
    const exportData = hasContacts
      ? contacts.map((contact) => {
        const row: Record<string, string> = {}
        if (fields.includes('name')) {
          const name = contact.is_company
            ? contact.company_name
            : [contact.first_name, contact.last_name].filter(Boolean).join(' ')
          row['Name'] = name || contact.email || 'Unknown'
        }
        if (fields.includes('email')) row['Email'] = contact.email || ''
        if (fields.includes('phone')) row['Phone'] = contact.phone || ''
        if (fields.includes('company')) row['Company'] = contact.is_company ? '' : (contact.company_name || '')
        if (fields.includes('status')) row['Status'] = contact.status || 'lead'
        if (fields.includes('tags')) row['Tags'] = Array.isArray(contact.tags) ? contact.tags.join(', ') : ''
        if (fields.includes('createdAt')) {
          row['Created Date'] = contact.created_at ? new Date(contact.created_at).toISOString().split('T')[0] : ''
        }
        return row
      })
      : []

    // For PapaParse/XLSX to work correctly with empty data, we provide the columns
    const columns = fields.map(field => {
      const headerMap: Record<string, string> = {
        'name': 'Name',
        'email': 'Email',
        'phone': 'Phone',
        'company': 'Company',
        'status': 'Status',
        'tags': 'Tags',
        'createdAt': 'Created Date'
      }
      return headerMap[field] || field
    })

    // Generate file based on format
    if (format === 'csv') {
      // Generate CSV
      // Generate CSV
      const csv = Papa.unparse({
        fields: columns,
        data: exportData
      })
      const filename = `contacts-export-${new Date().toISOString().split('T')[0]}.csv`

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else if (format === 'xlsx') {
      // Generate Excel using ExcelJS (no CVEs — replaces xlsx)
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'MenteIQ'
      workbook.created = new Date()
      const worksheet = workbook.addWorksheet('Contacts')

      // Bold header row
      worksheet.columns = columns.map(col => ({ header: col, key: col, width: 20 }))
      worksheet.getRow(1).font = { bold: true }

      // Data rows
      exportData.forEach(row => worksheet.addRow(row))

      const buffer = await workbook.xlsx.writeBuffer()
      const filename = `contacts-export-${new Date().toISOString().split('T')[0]}.xlsx`

      return new NextResponse(buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else {
      return NextResponse.json(
        { error: 'Unsupported format' },
        { status: 400 }
      )
    }

  } catch (error: unknown) {
    Sentry.captureException(error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
