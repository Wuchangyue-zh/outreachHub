'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, XCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/hooks/use-i18n'

interface AvatarUploadProps {
  currentAvatar?: string | null
  onUpload?: (url: string) => void
  size?: 'sm' | 'md' | 'lg'
}

export function AvatarUpload({ currentAvatar, onUpload, size = 'md' }: AvatarUploadProps) {
  const { addToast } = useToast()
  const { t } = useI18n()
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-32 w-32',
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', title: t('avatar.fileTooLarge'), description: t('avatar.maxSize') })
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', title: t('avatar.invalidType'), description: t('avatar.imageOnly') })
      return
    }

    // Create preview
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.success) {
        addToast({ type: 'success', title: t('avatar.uploadSuccess'), description: t('avatar.updated') })
        onUpload?.(data.data.url)
      } else {
        addToast({ type: 'error', title: t('avatar.uploadFailed'), description: data.error })
        setPreviewUrl(currentAvatar || null)
      }
    } catch (e) {
      addToast({ type: 'error', title: t('avatar.uploadFailed'), description: t('common.networkError') })
      setPreviewUrl(currentAvatar || null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onUpload?.('')
    addToast({ type: 'info', title: t('avatar.removed') })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200`}>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Upload overlay */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center disabled:opacity-0"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </button>

        {/* Remove button */}
        {previewUrl && (
          <button
            onClick={handleRemove}
            className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
          >
            <XCircle className="h-3 w-3" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="text-xs text-gray-500">
        {uploading ? t('avatar.uploading') : t('avatar.changeAvatar')}
      </p>
    </div>
  )
}
