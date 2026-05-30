'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react'

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
      <AcceptInviteContent />
    </Suspense>
  )
}

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [tenantName, setTenantName] = useState('')

  const handleAccept = async () => {
    if (!token) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: password || undefined, name: name || undefined }),
      })
      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        setTenantName(data.data?.tenant?.name || '')
        setTimeout(() => router.push('/dashboard'), 2000)
      } else if (
        data.error?.message?.includes('密码') ||
        data.error?.code === 'MISSING_REQUIRED_FIELD'
      ) {
        setNeedsPassword(true)
      } else {
        setError(data.error?.message || data.error || '接受邀请失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) handleAccept()
  }, [token])

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <p className="text-gray-600">无效的邀请链接</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">加入成功！</h2>
            <p className="text-gray-600">
              {tenantName ? `欢迎加入 ${tenantName} 团队` : '已成功加入团队'}
            </p>
            <p className="text-sm text-gray-400 mt-2">正在跳转到仪表盘...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> 设置密码加入团队
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">该邮箱尚未注册，请设置密码完成注册并加入团队。</p>
            <div className="space-y-2">
              <Label htmlFor="name">显示名称</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="您的名字" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码 *</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={handleAccept} disabled={loading || !password} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              注册并加入
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          {loading ? (
            <>
              <Loader2 className="h-12 w-12 mx-auto text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">正在处理邀请...</p>
            </>
          ) : error ? (
            <>
              <XCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button variant="outline" onClick={() => router.push('/login')}>返回登录</Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
