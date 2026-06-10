'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setSent(true)
      } else {
        setError(data.message || data.error?.message || '发送失败，请稍后重试')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2">
            <Mail className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-gray-900">OutreachHub</span>
          </Link>

          <div className="mt-12">
            <h1 className="text-2xl font-bold text-gray-900">忘记密码</h1>
            <p className="mt-2 text-sm text-gray-500">
              输入注册邮箱，我们将发送密码重置链接
            </p>
          </div>

          {sent ? (
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">邮件已发送</p>
                  <p className="mt-1 text-green-700">
                    如果 <strong>{email}</strong> 已注册，请查收邮件并点击重置链接（1 小时内有效）。
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
              >
                <ArrowLeft className="h-4 w-4" />
                返回登录
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    邮箱地址
                  </label>
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

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? '发送中...' : '发送重置链接'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                <Link href="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  返回登录
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="mx-auto max-w-md text-white">
          <h2 className="text-3xl font-bold">安全重置密码</h2>
          <p className="mt-4 text-lg text-blue-100">
            重置链接将发送至您的注册邮箱，请勿将链接分享给他人。
          </p>
        </div>
      </div>
    </div>
  )
}
