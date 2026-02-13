'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, FileSpreadsheet, File, CheckCircle2, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'

interface ExportContactsDialogProps {
  totalContacts: number
}

type ExportFormat = 'csv' | 'xlsx'

interface ExportOptions {
  format: ExportFormat
  includeFields: {
    name: boolean
    email: boolean
    phone: boolean
    company: boolean
    status: boolean
    tags: boolean
    createdAt: boolean
  }
}

export function ExportContactsDialog({ totalContacts }: ExportContactsDialogProps) {
  const [open, setOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    includeFields: {
      name: true,
      email: true,
      phone: true,
      company: true,
      status: true,
      tags: true,
      createdAt: false,
    }
  })

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)

    try {
      // Build query params for selected fields
      const fields = Object.entries(options.includeFields)
        .filter(([_, include]) => include)
        .map(([field]) => field)
        .join(',')

      const response = await fetch(`/api/contacts/export?format=${options.format}&fields=${fields}`, {
        method: 'GET',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/)
      const filename = filenameMatch?.[1] || `contacts-export.${options.format}`

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Close dialog
      setOpen(false)
    } catch (err: any) {
      console.error('Export error:', err)
      setError(err.message || 'Failed to export contacts')
    } finally {
      setIsExporting(false)
    }
  }

  const toggleField = (field: keyof ExportOptions['includeFields']) => {
    setOptions(prev => ({
      ...prev,
      includeFields: {
        ...prev.includeFields,
        [field]: !prev.includeFields[field]
      }
    }))
  }

  const selectedFieldsCount = Object.values(options.includeFields).filter(Boolean).length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Contacts</DialogTitle>
          <DialogDescription>
            Download your contacts in CSV or Excel format
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup
              value={options.format}
              onValueChange={(value) => setOptions(prev => ({ ...prev, format: value as ExportFormat }))}
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileSpreadsheet className="h-4 w-4 text-gray-600" />
                  <div>
                    <div className="font-medium">CSV</div>
                    <div className="text-xs text-gray-500">Comma-separated values</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <Label htmlFor="xlsx" className="flex items-center gap-2 cursor-pointer flex-1">
                  <File className="h-4 w-4 text-gray-600" />
                  <div>
                    <div className="font-medium">Excel</div>
                    <div className="text-xs text-gray-500">Microsoft Excel (.xlsx)</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Field Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Include Fields</Label>
            <div className="border rounded-lg p-4 space-y-3">
              {Object.entries(options.includeFields).map(([field, included]) => (
                <div key={field} className="flex items-center space-x-2">
                  <Checkbox
                    id={field}
                    checked={included}
                    onCheckedChange={() => toggleField(field as keyof ExportOptions['includeFields'])}
                  />
                  <Label
                    htmlFor={field}
                    className="text-sm font-normal cursor-pointer capitalize"
                  >
                    {field === 'createdAt' ? 'Created Date' : field}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              {selectedFieldsCount} field{selectedFieldsCount !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Ready to export</p>
                <p className="text-blue-700">
                  {totalContacts} contact{totalContacts !== 1 ? 's' : ''} · {selectedFieldsCount} field{selectedFieldsCount !== 1 ? 's' : ''} · {options.format.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || selectedFieldsCount === 0}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
