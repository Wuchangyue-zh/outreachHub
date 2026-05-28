'use client'

import { useState, useRef, useCallback } from 'react'
import { FileText, Upload, X, Loader2, Paperclip } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

export interface UploadedFile {
  name: string
  url: string
  size: number
  mimeType: string
}

interface FileUploadProps {
  maxFiles?: number
  maxSize?: number // in bytes
  accept?: string
  onFilesUploaded?: (files: UploadedFile[]) => void
}

export function FileUpload({
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB
  accept = '*',
  onFilesUploaded,
}: FileUploadProps) {
  const { addToast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    if (uploadedFiles.length + files.length > maxFiles) {
      addToast({ type: 'error', title: '文件过多', description: `最多只能上传 ${maxFiles} 个文件` })
      return
    }

    setUploading(true)
    const newFiles: UploadedFile[] = []

    for (const file of Array.from(files)) {
      // Validate size
      if (file.size > maxSize) {
        addToast({ type: 'error', title: '文件过大', description: `${file.name} 超过 ${maxSize / 1024 / 1024}MB 限制` })
        continue
      }

      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload/attachment', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()

        if (data.success) {
          const uploadedFile: UploadedFile = {
            name: file.name,
            url: data.data.url,
            size: data.data.size,
            mimeType: data.data.mimeType,
          }
          newFiles.push(uploadedFile)
        } else {
          addToast({ type: 'error', title: '上传失败', description: `${file.name}: ${data.error}` })
        }
      } catch (e) {
        addToast({ type: 'error', title: '上传失败', description: file.name })
      }
    }

    if (newFiles.length > 0) {
      const allFiles = [...uploadedFiles, ...newFiles]
      setUploadedFiles(allFiles)
      onFilesUploaded?.(allFiles)
    }

    setUploading(false)
  }, [uploadedFiles, maxFiles, maxSize, onFilesUploaded, addToast])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleRemove = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(newFiles)
    onFilesUploaded?.(newFiles)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">
          拖放文件到此处，或 <span className="text-primary">点击选择</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          最多 {maxFiles} 个文件，每个不超过 {formatSize(maxSize)}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
              </div>
              <button
                onClick={() => handleRemove(index)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload indicator */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>上传中...</span>
        </div>
      )}
    </div>
  )
}
