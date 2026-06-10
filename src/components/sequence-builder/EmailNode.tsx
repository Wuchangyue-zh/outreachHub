'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Mail, Trash2 } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

interface EmailNodeData {
  label: string
  subject: string
  content: string
  stepIndex: number
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  [key: string]: unknown
}

function EmailNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as EmailNodeData
  const { t } = useI18n()

  return (
    <div className="group relative min-w-[200px] rounded-xl border-2 border-blue-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-400">
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />

      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-3 w-3 text-blue-600" />
          </div>
          <span className="text-xs font-semibold text-blue-700">
            {t('sequenceBuilder.email.emailNumber', { number: nodeData.stepIndex + 1 })}
          </span>
        </div>

        <p className="text-sm font-medium text-gray-900 truncate" title={nodeData.subject}>
          {nodeData.subject || t('sequenceBuilder.email.noSubject')}
        </p>
        <p className="mt-1 text-xs text-gray-500 line-clamp-2" title={nodeData.content}>
          {nodeData.content || t('sequenceBuilder.email.noContent')}
        </p>
      </div>

      {/* 删除按钮 */}
      <button
        type="button"
        onClick={() => nodeData.onDelete?.(id)}
        className="absolute -top-2 -right-2 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex hover:bg-red-600 transition-colors"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  )
}

export const EmailNode = memo(EmailNodeComponent)
