'use client'

import { useState, useCallback, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet, File, X, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface ImportContactsDialogProps {
  onImportComplete?: () => void
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete'

interface ParsedData {
  headers: string[]
  rows: any[]
  fileName: string
  fileType: 'csv' | 'xlsx' | 'vcf'
}

// OrbitCRM field definitions
const ORBITCRM_FIELDS = [
  { value: 'firstName', label: 'First Name', required: true },
  { value: 'lastName', label: 'Last Name', required: false },
  { value: 'companyName', label: 'Company Name', required: false },
  { value: 'email', label: 'Email', required: true },
  { value: 'phone', label: 'Phone', required: false },
  { value: 'status', label: 'Status', required: false },
  { value: 'tags', label: 'Tags', required: false },
  { value: 'skip', label: '(Skip this column)', required: false },
] as const

type ColumnMapping = Record<string, string>

// Auto-detect column mappings based on common patterns
function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}

  headers.forEach(header => {
    const lowerHeader = header.toLowerCase().trim()

    if (lowerHeader === 'first name' || lowerHeader === 'given name' || lowerHeader === 'fname') {
      mapping[header] = 'firstName'
    } else if (lowerHeader === 'last name' || lowerHeader === 'family name' || lowerHeader === 'lname') {
      mapping[header] = 'lastName'
    } else if (lowerHeader === 'name' || lowerHeader === 'full name' || lowerHeader === 'contact') {
      mapping[header] = 'firstName' // Default to first name if single name column
    } else if (lowerHeader.includes('email') || lowerHeader === 'e-mail') {
      mapping[header] = 'email'
    } else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('tel')) {
      mapping[header] = 'phone'
    } else if (lowerHeader.includes('company') || lowerHeader.includes('organization') || lowerHeader.includes('org')) {
      mapping[header] = 'companyName'
    } else if (lowerHeader.includes('status') || lowerHeader.includes('stage')) {
      mapping[header] = 'status'
    } else if (lowerHeader.includes('tag')) {
      mapping[header] = 'tags'
    } else {
      mapping[header] = 'skip'
    }
  })

  return mapping
}

export function ImportContactsDialog({ onImportComplete }: ImportContactsDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<ImportStep>('upload')
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    duplicates: any[]
  } | null>(null)
  const [validationErrors, setValidationErrors] = useState<{ row: number, errors: { field: string, message: string }[] }[]>([])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setError(null)

    try {
      const fileType = file.name.endsWith('.csv') ? 'csv'
        : file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'xlsx'
          : file.name.endsWith('.vcf') ? 'vcf'
            : null

      if (!fileType) {
        setError('Unsupported file type. Please upload CSV, Excel, or vCard files.')
        return
      }

      if (fileType === 'csv') {
        // Parse CSV
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data.length === 0) {
              setError('File is empty or could not be parsed.')
              return
            }

            const headers = results.meta.fields || []
            setParsedData({
              headers,
              rows: results.data,
              fileName: file.name,
              fileType: 'csv'
            })
            setColumnMapping(autoDetectMapping(headers))
            setStep('mapping')
          },
          error: (error) => {
            setError(`CSV parsing error: ${error.message}`)
          }
        })
      } else if (fileType === 'xlsx') {
        // Parse Excel
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

        if (jsonData.length < 2) {
          setError('Excel file must have at least 2 rows (header + data).')
          return
        }

        const headers = (jsonData[0] as any[]).map(String)
        const rows = jsonData.slice(1).map((row: any) => {
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header] = row[index] || ''
          })
          return obj
        })

        setParsedData({
          headers,
          rows,
          fileName: file.name,
          fileType: 'xlsx'
        })
        setColumnMapping(autoDetectMapping(headers))
        setStep('mapping')
      } else if (fileType === 'vcf') {
        // TODO: Implement vCard parsing
        setError('vCard import coming soon. Please use CSV or Excel for now.')
      }
    } catch (err: any) {
      setError(`Failed to parse file: ${err.message}`)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/vcard': ['.vcf']
    },
    maxFiles: 1
  })

  // Validate column mapping
  const mappingValidation = useMemo(() => {
    const mappedFields = Object.values(columnMapping).filter(v => v !== 'skip')
    const hasFirstName = mappedFields.includes('firstName')
    const hasEmail = mappedFields.includes('email')
    const isValid = hasFirstName && hasEmail

    return {
      isValid,
      errors: [
        ...(!hasFirstName ? ['First Name field is required'] : []),
        ...(!hasEmail ? ['Email field is required'] : []),
      ]
    }
  }, [columnMapping])

  // Preview data with mapped columns
  const previewData = useMemo(() => {
    if (!parsedData) return []

    return parsedData.rows.slice(0, 50).map(row => {
      const mapped: any = {}
      Object.entries(columnMapping).forEach(([sourceCol, targetField]) => {
        if (targetField !== 'skip') {
          mapped[targetField] = row[sourceCol]
        }
      })
      return mapped
    })
  }, [parsedData, columnMapping])

  const handleReset = () => {
    setStep('upload')
    setParsedData(null)
    setColumnMapping({})
    setError(null)
    setProgress(0)
    setImportResult(null)
    setValidationErrors([])
  }

  const handleImport = async () => {
    if (!parsedData) return

    setStep('importing')
    setError(null)
    setProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90))
      }, 100)

      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contacts: parsedData.rows,
          columnMapping,
        }),
      })

      clearInterval(progressInterval)
      setProgress(100)

      const result = await response.json()

      if (!response.ok) {
        const errorData = result
        const error = new Error(result.error || 'Import failed') as any
        error.details = result.details
        throw error
      }

      setImportResult({
        imported: result.imported,
        skipped: result.skipped,
        duplicates: result.duplicates || []
      })

      setStep('complete')
    } catch (err: any) {
      console.error('Import error:', err)
      setError(err.message || 'Failed to import contacts')
      if (err.details?.errors) {
        setValidationErrors(err.details.errors)
      }
      setStep('preview')
    }
  }

  const handleClose = () => {
    setOpen(false)
    handleReset()
  }

  const updateColumnMapping = (sourceColumn: string, targetField: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [sourceColumn]: targetField
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import Contacts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import your contacts in bulk
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="space-y-2">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-bold text-red-800 mb-1">Row-level Validation Failures:</p>
                <ul className="space-y-1">
                  {validationErrors.map((err, i) => (
                    <li key={i} className="text-[11px] text-red-700">
                      Row {err.row}: {err.errors.map(e => `${e.field}: ${e.message}`).join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
                }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-lg font-medium">Drop your file here...</p>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">
                    Drag and drop your file here
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    or click to browse
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV
                    </div>
                    <div className="flex items-center gap-1">
                      <File className="h-4 w-4" />
                      Excel
                    </div>
                    <div className="flex items-center gap-1">
                      <File className="h-4 w-4" />
                      vCard
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Supported file formats:
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• CSV (.csv) - Comma-separated values</li>
                <li>• Excel (.xlsx, .xls) - Microsoft Excel spreadsheet</li>
                <li>• vCard (.vcf) - Contact card format (coming soon)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && parsedData && (
          <div className="space-y-4 w-full overflow-hidden">
            <div className="bg-gray-50 border rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-1">File uploaded successfully:</p>
                <p className="text-sm text-gray-600 truncate max-w-[250px] sm:max-w-md">
                  {parsedData.fileName} · {parsedData.rows.length} contacts found
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                Change File
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Map Your Columns</h3>
              <p className="text-sm text-gray-600 mb-4">
                Match your file's columns to OrbitCRM fields. Required fields: First Name and Email
              </p>

              <div className="border rounded-lg overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Your Column</TableHead>
                      <TableHead className="w-1/3">Maps To</TableHead>
                      <TableHead className="w-1/3">Sample Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.headers.map((header) => (
                      <TableRow key={header}>
                        <TableCell className="font-medium">{header}</TableCell>
                        <TableCell>
                          <Select
                            value={columnMapping[header]}
                            onValueChange={(value) => updateColumnMapping(header, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ORBITCRM_FIELDS.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  <div className="flex items-center gap-2">
                                    {field.label} {field.required && <Badge variant="destructive" className="ml-1 text-xs">Required</Badge>}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 italic max-w-0 truncate">
                          {parsedData.rows[0]?.[header] || '(empty)'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {!mappingValidation.isValid && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Please fix the following errors:</p>
                  <ul className="list-disc list-inside">
                    {mappingValidation.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={handleReset}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStep('preview')}
                disabled={!mappingValidation.isValid}
              >
                Continue to Preview
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && parsedData && (
          <div className="space-y-4 w-full overflow-hidden">
            <div>
              <h3 className="text-lg font-medium mb-2">Preview Import</h3>
              <p className="text-sm text-gray-600 mb-4">
                Showing first {Math.min(50, parsedData.rows.length)} of {parsedData.rows.length} contacts
              </p>

              <div className="border rounded-lg overflow-x-auto w-full">
                <Table className="w-full" style={{ minWidth: '800px' }}>
                  <TableHeader>
                    <TableRow>
                      {ORBITCRM_FIELDS.filter(f => f.value !== 'skip' && Object.values(columnMapping).includes(f.value)).map((field) => (
                        <TableHead key={field.value} className="whitespace-nowrap font-semibold">
                          {field.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, i) => (
                      <TableRow key={i}>
                        {ORBITCRM_FIELDS.filter(f => f.value !== 'skip' && Object.values(columnMapping).includes(f.value)).map((field) => (
                          <TableCell key={`${i}-${field.value}`} className="whitespace-nowrap">
                            {row[field.value] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="outline" onClick={() => setStep('mapping')} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Mapping
              </Button>
              <Button onClick={handleImport} className="flex items-center gap-2">
                Start Import ({parsedData.rows.length} contacts)
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <p className="text-lg font-medium mb-4">Importing contacts...</p>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-500 mt-2">{progress}% complete</p>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && importResult && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600" />
              <p className="text-lg font-medium mb-2">Import Complete!</p>
              <p className="text-sm text-gray-600">
                Successfully imported {importResult.imported} contacts
              </p>
              {importResult.skipped > 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  {importResult.skipped} duplicate(s) skipped
                </p>
              )}
            </div>

            {importResult.duplicates.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Duplicates found:</p>
                  <ul className="text-sm space-y-1">
                    {importResult.duplicates.slice(0, 5).map((dup, i) => (
                      <li key={i}>Row {dup.row}: {dup.email}</li>
                    ))}
                    {importResult.duplicates.length > 5 && (
                      <li>...and {importResult.duplicates.length - 5} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button onClick={() => {
                handleClose()
                onImportComplete?.()
              }}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
