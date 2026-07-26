'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiErrorMessage, fetchJson } from './api'

type Props = {
  campaignId: string | null
  launched: boolean
  onLaunched: () => void
  onReset: () => void
}

export function StepLaunch({ campaignId, launched, onLaunched, onReset }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [queuedHint, setQueuedHint] = useState('')

  const handleLaunch = async () => {
    if (!campaignId) {
      setError('尚未创建活动草稿')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { ok, data } = await fetchJson<{ success: boolean; message?: string; data?: unknown }>(
        `/api/campaigns/${campaignId}/launch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      )
      if (!ok || !data.success) {
        setError(apiErrorMessage(data, '启动失败'))
        return
      }
      setQueuedHint('活动已启动，邮件已进入发送队列（需 Email Worker 实际投递）。')
      onLaunched()
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        启动后系统将邮件任务写入队列。生产环境请确认已运行 <code className="text-xs bg-gray-100 px-1 rounded">worker:email</code>。
      </p>

      {!launched ? (
        <Button
          type="button"
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          disabled={loading || !campaignId}
          onClick={handleLaunch}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          启动营销活动
        </Button>
      ) : (
        <div className="space-y-4 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-indigo-900">
            <CheckCircle2 className="h-5 w-5 text-indigo-600" />
            快速开始流程已完成
          </p>
          {queuedHint && <p className="text-sm text-indigo-800">{queuedHint}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => router.push('/dashboard')}>
              返回仪表盘
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/email-queue">队列监控</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/campaigns">活动列表</Link>
            </Button>
            <Button type="button" variant="ghost" onClick={onReset}>
              重新开始向导
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}
    </div>
  )
}
