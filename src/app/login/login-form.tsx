'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Loader2, AlertCircle, Shield } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirect') || '/dashboard'
  const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard'
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('请输入邮箱和密码')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (data.success) {
        addToast({ type: 'success', title: '登录成功', description: `欢迎回来，${data.user.name}` })
        router.push(redirectTo)
      } else if (data.requires2FA) {
        // Switch to 2FA verification step
        setRequires2FA(true)
        setTempToken(data.tempToken)
        setError('')
      } else {
        const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || '登录失败'
        setError(errorMsg)
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const body: Record<string, string> = { tempToken }
      if (useBackupCode) {
        body.backupCode = backupCode.trim()
      } else {
        body.code = twoFactorCode.trim()
      }

      const res = await fetch('/api/auth/login/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.success) {
        addToast({ type: 'success', title: '登录成功', description: `欢迎回来，${data.user.name}` })
        router.push(redirectTo)
      } else {
        const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || '验证失败'
        setError(errorMsg)
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 2FA verification step
  if (requires2FA) {
    return (
      <div className="flex min-h-screen">
        <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16">
          <div className="mx-auto w-full max-w-sm">
            <Link href="/" className="flex items-center gap-2">
              <Mail className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-gray-900">OutreachHub</span>
            </Link>

            <div className="mt-12">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-gray-900">两步验证</h1>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {useBackupCode ? '请输入备用恢复码' : '请输入身份验证器应用中的6位验证码'}
              </p>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            <form onSubmit={handle2FAVerify} className="mt-8 space-y-5">
              {useBackupCode ? (
                <div>
                  <label htmlFor="backupCode" className="block text-sm font-medium text-gray-700">备用恢复码</label>
                  <input
                    id="backupCode"
                    type="text"
                    required
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    placeholder="例如：A1B2C3D4"
                    disabled={loading}
                    autoComplete="one-time-code"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700">验证码</label>
                  <input
                    id="twoFactorCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-center text-lg tracking-[0.5em] font-mono"
                    placeholder="000000"
                    disabled={loading}
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (!useBackupCode && twoFactorCode.length !== 6) || (useBackupCode && !backupCode.trim())}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? '验证中...' : '验证'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode)
                  setError('')
                  setTwoFactorCode('')
                  setBackupCode('')
                }}
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                {useBackupCode ? '使用身份验证器验证码' : '使用备用恢复码'}
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-gray-500">
              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false)
                  setTempToken('')
                  setTwoFactorCode('')
                  setBackupCode('')
                  setUseBackupCode(false)
                  setError('')
                }}
                className="font-medium text-primary hover:text-primary/80"
              >
                返回登录
              </button>
            </p>
          </div>
        </div>

        <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 lg:flex lg:flex-col lg:justify-center lg:px-16">
          <div className="mx-auto max-w-md text-white">
            <h2 className="text-3xl font-bold">智能海外拓客与邮件营销</h2>
            <p className="mt-4 text-lg text-blue-100">
              帮助中国出海企业高效拓展海外客户，通过AI驱动的邮件营销提升转化率
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Default login step
  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2">
            <Mail className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-gray-900">OutreachHub</span>
          </Link>

          <div className="mt-12">
            <h1 className="text-2xl font-bold text-gray-900">欢迎回来</h1>
            <p className="mt-2 text-sm text-gray-500">登录您的账户以继续</p>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">邮箱地址</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">密码</label>
                <Link href="/forgot-password" className="text-sm font-medium text-primary hover:text-primary/80">
                  忘记密码？
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="输入密码"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-500">演示账户：admin@outreachhub.com / admin123</p>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            还没有账户？{' '}
            <Link href="/register" className="font-medium text-primary hover:text-primary/80">免费注册</Link>
          </p>
        </div>
      </div>

      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="mx-auto max-w-md text-white">
          <h2 className="text-3xl font-bold">智能海外拓客与邮件营销</h2>
          <p className="mt-4 text-lg text-blue-100">
            帮助中国出海企业高效拓展海外客户，通过AI驱动的邮件营销提升转化率
          </p>
        </div>
      </div>
    </div>
  )
}
