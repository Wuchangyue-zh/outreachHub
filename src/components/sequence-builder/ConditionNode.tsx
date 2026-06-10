'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { GitBranch, Trash2, Eye, MousePointerClick, MessageSquare, EyeOff } from 'lucide-react'

type ConditionType = 'opened' | 'clicked' | 'replied' | 'not_opened'

interface ConditionNodeData {
  label: string
  conditionType: ConditionType
  lookbackHours: number
  onDelete?: (id: string) => void
  [key: string]: unknown
}

const CONDITION_CONFIG: Record<ConditionType, { label: string; icon: typeof Eye; color: string }> = {
  opened: { label: '已打开邮件', icon: Eye, color: 'text-green-600' },
  clicked: { label: '已点击链接', icon: MousePointerClick, color: 'text-blue-600' },
  replied: { label: '已回复', icon: MessageSquare, color: 'text-purple-600' },
  not_opened: { label: '未打开', icon: EyeOff, color: 'text-red-600' },
}

function ConditionNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as ConditionNodeData
  const config = CONDITION_CONFIG[nodeData.conditionType] || CONDITION_CONFIG.opened
  const Icon = config.icon

  return (
    <div className="group relative min-w-[180px] rounded-xl border-2 border-purple-200 bg-purple-50 shadow-sm transition-all hover:shadow-md hover:border-purple-400">
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />

      <div className="p-3 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100">
            <GitBranch className="h-3 w-3 text-purple-600" />
          </div>
          <span className="text-xs font-semibold text-purple-700">条件分支</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <Icon className={`h-4 w-4 ${config.color}`} />
          <p className="text-sm font-medium text-gray-900">{config.label}</p>
        </div>
        <p className="mt-1 text-[10px] text-gray-400">回溯 {nodeData.lookbackHours || 72}h</p>
      </div>

      <button
        type="button"
        onClick={() => nodeData.onDelete?.(id)}
        className="absolute -top-2 -right-2 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex hover:bg-red-600 transition-colors"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      {/* 两个输出：左侧 = true（满足），右侧 = false（不满足） */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '30%' }}
        className="!bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '70%' }}
        className="!bg-red-400"
      />

      {/* 分支标签 */}
      <div className="absolute -bottom-5 left-0 right-0 flex justify-around">
        <span className="text-[9px] text-green-600 font-medium">✓ 是</span>
        <span className="text-[9px] text-red-400 font-medium">✗ 否</span>
      </div>
    </div>
  )
}

export const ConditionNode = memo(ConditionNodeComponent)
