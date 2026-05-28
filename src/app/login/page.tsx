'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

export default function LoginPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        router.push('/dashboard')
      } else {
        setError(data.error || '登录失败')
      }
    } catch (e) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - form */}
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">密码</label>
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

      {/* Right side - branding */}
      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="mx-auto max-w-md text-white">
          <h2 className="text-3xl font-bold">智能海外拓客与邮件营销</h2>
          <p className="mt-4 text-lg text-blue-100">
            帮助中国出海企业高效拓展海外客户，通过AI驱动的邮件营销提升转化率
          </p>
          <div className="mt-10 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">1</div>
              <div>
                <p className="font-semibold">AI智能拓客</p>
                <p className="text-sm text-blue-200">精准定位目标客户，自动挖掘有效邮箱</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">2</div>
              <div>
                <p className="font-semibold">个性化邮件</p>
                <p className="text-sm text-blue-200">AI生成个性化内容，提升打开率和回复率</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">3</div>
              <div>
                <p className="font-semibold">数据驱动</p>
                <p className="text-sm text-blue-200">全链路数据追踪，持续优化营销策略</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}