'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CSVImportProps {
  onImportComplete?: (result: ImportResult) => void
}

interface ImportResult {
  total: number
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

interface ParseResult {
  headers: string[]
  previewRows: Record<string, string>[]
  totalRows: number
  suggestedMapping: Record<string, string>
}

const CONTACT_FIELDS = [
  { value: 'email', label: 'Email *', required: true },
  { value: 'firstName', label: 'First Name *', required: true },
  { value: 'lastName', label: 'Last Name', required: false },
  { value: 'fullName', label: 'Full Name', required: false },
  { value: 'company', label: 'Company', required: false },
  { value: 'title', label: 'Job Title', required: false },
  { value: 'phone', label: 'Phone', required: false },
  { value: 'country', label: 'Country', required: false },
  { value: 'city', label: 'City', required: false },
  { value: 'industry', label: 'Industry', required: false },
  { value: 'tags', label: 'Tags', required: false },
]

export function CSVImport({ onImportComplete }: CSVImportProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [csvContent, setCsvContent] = useState<string>('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string>('')

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setStep('upload')

    try {
      // Read file content
      const content = await file.text()
      setCsvContent(content)

      // Upload and parse
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/contacts/import/parse', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Failed to parse CSV')
        return
      }

      setParseResult(result.data)
      setMapping(result.data.suggestedMapping)
      setStep('preview')
    } catch (err: any) {
      setError(err.message || 'Failed to upload file')
    }
  }, [])

  const handleMappingChange = useCallback((csvColumn: string, contactField: string) => {
    setMapping((prev) => ({
      ...prev,
      [csvColumn]: contactField,
    }))
  }, [])

  const handleImport = useCallback(async () => {
    if (!parseResult) return

    setStep('importing')
    setError('')

    try {
      const response = await fetch('/api/contacts/import/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvContent,
          mapping,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Failed to import contacts')
        setStep('preview')
        return
      }

      setImportResult(result.data)
      setStep('complete')

      if (onImportComplete) {
        onImportComplete(result.data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import contacts')
      setStep('preview')
    }
  }, [parseResult, csvContent, mapping, onImportComplete])

  const handleReset = useCallback(() => {
    setStep('upload')
    setParseResult(null)
    setMapping({})
    setCsvContent('')
    setImportResult(null)
    setError('')
  }, [])

  if (step === 'upload') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Contacts from CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-4">
              Upload a CSV file to import contacts
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <Button asChild>
                <span>Choose CSV File</span>
              </Button>
            </label>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• File must be in CSV format (.csv)</li>
              <li>• First row should contain column headers</li>
              <li>• Required fields: Email, First Name</li>
              <li>• Maximum file size: 10MB</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'preview' && parseResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Map CSV Columns</span>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Start Over
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">
              Found <strong>{parseResult.totalRows}</strong> rows in your CSV file.
              Map each CSV column to the corresponding contact field.
            </p>
          </div>

          {/* Column Mapping */}
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium">Column Mapping</h4>
            {parseResult.headers.map((header) => (
              <div key={header} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{header}</span>
                  </div>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex-1">
                  <select
                    value={mapping[header] || ''}
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Skip this column</option>
                    {CONTACT_FIELDS.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Preview Table */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-2">Preview (first 10 rows)</h4>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {parseResult.headers.map((header) => (
                      <th key={header} className="px-4 py-2 text-left font-medium text-gray-700">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.previewRows.map((row, i) => (
                    <tr key={i} className="border-t border-gray-200">
                      {parseResult.headers.map((header) => (
                        <td key={header} className="px-4 py-2 text-gray-600">
                          {row[header] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleImport}>
              Import {parseResult.totalRows} Contacts
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'importing') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Importing contacts...</p>
        </CardContent>
      </Card>
    )
  }

  if (step === 'complete' && importResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Complete</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Successfully imported {importResult.success} contacts</p>
                <p className="text-sm text-green-700">Total processed: {importResult.total}</p>
              </div>
            </div>

            {importResult.failed > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-yellow-600" />
                  <p className="font-medium text-yellow-900">
                    {importResult.failed} contacts failed to import
                  </p>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li className="text-yellow-600">
                        ... and {importResult.errors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <Button onClick={handleReset}>Import More Contacts</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
