'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/hooks/use-i18n'

export default function LoginPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError(t('auth.enterEmailPassword'))
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
        addToast({ type: 'success', title: t('auth.loginSuccess'), description: t('auth.welcomeBack').replace('{name}', data.user.name) })
        router.push('/dashboard')
      } else {
        const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || t('auth.loginFailed')
        setError(errorMsg)
      }
    } catch (e) {
      setError(t('common.networkError'))
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
            <h1 className="text-2xl font-bold text-gray-900">{t('auth.welcomeBack')}</h1>
            <p className="mt-2 text-sm text-gray-500">{t('auth.loginSubtitle')}</p>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">{t('auth.email')}</label>
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">{t('auth.password')}</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t('auth.passwordPlaceholder')}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-500">{t('auth.demoAccount')}</p>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t('auth.noAccount')}{' '}
            <Link href="/register" className="font-medium text-primary hover:text-primary/80">{t('auth.freeRegister')}</Link>
          </p>
        </div>
      </div>

      {/* Right side - branding */}
      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="mx-auto max-w-md text-white">
          <h2 className="text-3xl font-bold">{t('login.branding.title')}</h2>
          <p className="mt-4 text-lg text-blue-100">
            {t('login.branding.subtitle')}
          </p>
          <div className="mt-10 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">1</div>
              <div>
                <p className="font-semibold">{t('login.branding.feature1')}</p>
                <p className="text-sm text-blue-200">{t('login.branding.feature1Desc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">2</div>
              <div>
                <p className="font-semibold">{t('login.branding.feature2')}</p>
                <p className="text-sm text-blue-200">{t('login.branding.feature2Desc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">3</div>
              <div>
                <p className="font-semibold">{t('login.branding.feature3')}</p>
                <p className="text-sm text-blue-200">{t('login.branding.feature3Desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}