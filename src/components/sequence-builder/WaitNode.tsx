'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Clock, Trash2 } from 'lucide-react'

interface WaitNodeData {
  label: string
  delayHours: number
  onDelete?: (id: string) => void
  [key: string]: unknown
}

function WaitNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as WaitNodeData

  const formatDelay = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return remainingHours > 0 ? `${days}天${remainingHours}小时` : `${days}天`
    }
    return `${hours}小时`
  }

  return (
    <div className="group relative min-w-[160px] rounded-xl border-2 border-amber-200 bg-amber-50 shadow-sm transition-all hover:shadow-md hover:border-amber-400">
      <Handle type="target" position={Position.Top} className="!bg-amber-500" />

      <div className="p-3 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-3 w-3 text-amber-600" />
          </div>
          <span className="text-xs font-semibold text-amber-700">等待</span>
        </div>
        <p className="text-sm font-bold text-amber-900">{formatDelay(nodeData.delayHours)}</p>
      </div>

      <button
        type="button"
        onClick={() => nodeData.onDelete?.(id)}
        className="absolute -top-2 -right-2 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex hover:bg-red-600 transition-colors"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
    </div>
  )
}

export const WaitNode = memo(WaitNodeComponent)
