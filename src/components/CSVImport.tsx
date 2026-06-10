'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/hooks/use-i18n'

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

export function CSVImport({ onImportComplete }: CSVImportProps) {
  const { t } = useI18n()
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [csvContent, setCsvContent] = useState<string>('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string>('')

  const getContactFields = useCallback(() => [
    { value: 'email', label: t('csvImport.fields.email') + ' *', required: true },
    { value: 'firstName', label: t('csvImport.fields.firstName') + ' *', required: true },
    { value: 'lastName', label: t('csvImport.fields.lastName'), required: false },
    { value: 'fullName', label: t('csvImport.fields.fullName') || 'Full Name', required: false },
    { value: 'company', label: t('csvImport.fields.company'), required: false },
    { value: 'title', label: t('csvImport.fields.title'), required: false },
    { value: 'phone', label: t('csvImport.fields.phone'), required: false },
    { value: 'country', label: t('csvImport.fields.country'), required: false },
    { value: 'city', label: t('csvImport.fields.city'), required: false },
    { value: 'industry', label: 'Industry', required: false },
    { value: 'tags', label: 'Tags', required: false },
  ], [t])

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
        setError(result.error || t('csvImport.parseFailed'))
        return
      }

      setParseResult(result.data)
      setMapping(result.data.suggestedMapping)
      setStep('preview')
    } catch (err: any) {
      setError(err.message || t('csvImport.uploadFailed'))
    }
  }, [t])

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
        setError(result.error || t('csvImport.importFailed'))
        setStep('preview')
        return
      }

      setImportResult(result.data)
      setStep('complete')

      if (onImportComplete) {
        onImportComplete(result.data)
      }
    } catch (err: any) {
      setError(err.message || t('csvImport.importFailed'))
      setStep('preview')
    }
  }, [parseResult, csvContent, mapping, onImportComplete, t])

  const handleReset = useCallback(() => {
    setStep('upload')
    setParseResult(null)
    setMapping({})
    setCsvContent('')
    setImportResult(null)
    setError('')
  }, [])

  const CONTACT_FIELDS = getContactFields()

  if (step === 'upload') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('csvImport.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-4">
              {t('csvImport.uploadHint')}
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
                <span>{t('csvImport.chooseFile')}</span>
              </Button>
            </label>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">{t('common.error')}</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">{t('csvImport.requirements.title')}</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• {t('csvImport.requirements.line1')}</li>
              <li>• {t('csvImport.requirements.line2')}</li>
              <li>• {t('csvImport.requirements.line3')}</li>
              <li>• {t('csvImport.requirements.line4')}</li>
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
            <span>{t('csvImport.mapColumns')}</span>
            <Button variant="outline" size="sm" onClick={handleReset}>
              {t('csvImport.startOver')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">
              {t('csvImport.foundRows').replace('{n}', String(parseResult.totalRows))}
            </p>
          </div>

          {/* Column Mapping */}
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium">{t('csvImport.columnMapping')}</h4>
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
                    <option value="">{t('csvImport.skipColumn')}</option>
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
            <h4 className="text-sm font-medium mb-2">{t('csvImport.preview')}</h4>
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
                <p className="text-sm font-medium text-red-800">{t('common.error')}</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleImport}>
              {t('csvImport.importN').replace('{n}', String(parseResult.totalRows))}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              {t('common.cancel')}
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
          <p className="text-gray-600">{t('csvImport.importing')}</p>
        </CardContent>
      </Card>
    )
  }

  if (step === 'complete' && importResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('csvImport.complete')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-900">{t('csvImport.success').replace('{n}', String(importResult.success))}</p>
                <p className="text-sm text-green-700">{t('csvImport.totalProcessed').replace('{n}', String(importResult.total))}</p>
              </div>
            </div>

            {importResult.failed > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-yellow-600" />
                  <p className="font-medium text-yellow-900">
                    {t('csvImport.failed').replace('{n}', String(importResult.failed))}
                  </p>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>
                        {t('csvImport.rowError').replace('{row}', String(err.row)).replace('{error}', err.error)}
                      </li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li className="text-yellow-600">
                        {t('csvImport.moreErrors').replace('{n}', String(importResult.errors.length - 10))}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <Button onClick={handleReset}>{t('csvImport.importMore')}</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
