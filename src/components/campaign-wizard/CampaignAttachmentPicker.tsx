'use client'

import { useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Paperclip, Loader2, X } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

export interface CampaignAttachmentItem {
  id: string
  originalName: string
  size: number
}

interface Props {
  attachments: CampaignAttachmentItem[]
  onChange: (items: CampaignAttachmentItem[]) => void
}

export function CampaignAttachmentPicker({ attachments, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const { t } = useI18n()

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload/attachment', { method: 'POST', body: formData })
      const data = await res.json()
      if (!data.success || !data.data?.id) {
        setError(data.error?.message || t('campaignWizard.attachment.uploadFailed'))
        return
      }
      onChange([
        ...attachments,
        {
          id: data.data.id,
          originalName: data.data.originalName || file.name,
          size: data.data.size || file.size,
        },
      ])
    } catch {
      setError(t('campaignWizard.attachment.uploadFailed'))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await fetch(`/api/attachments?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch {
      /* 仍从 UI 移除，避免阻塞启动 */
    }
    onChange(attachments.filter((a) => a.id !== id))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5">
          <Paperclip className="h-4 w-4 text-gray-500" />
          {t('campaignWizard.attachment.title')}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('campaignWizard.attachment.addAttachment')}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
          }}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {attachments.length > 0 ? (
        <ul className="space-y-1">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <span className="truncate text-gray-800">{att.originalName}</span>
              <span className="shrink-0 text-xs text-gray-400">{formatSize(att.size)}</span>
              <button
                type="button"
                onClick={() => handleRemove(att.id)}
                className="shrink-0 text-gray-400 hover:text-red-600"
                aria-label={t('campaignWizard.attachment.removeAttachment')}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">{t('campaignWizard.attachment.hint')}</p>
      )}
    </div>
  )
}
