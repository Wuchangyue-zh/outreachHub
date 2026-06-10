'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/hooks/use-i18n'

export default function RegisterPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const { t } = useI18n()
  const [form, setForm] = useState({ email: '', password: '', name: '', company: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [consented, setConsented] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!consented) {
      setError('请先阅读并同意服务条款和隐私政策')
      return
    }

    if (!form.email || !form.password) {
      setError(t('auth.enterEmailPassword'))
      return
    }

    if (form.password.length < 6) {
      setError(t('auth.passwordMinLength'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, consentAt: new Date().toISOString() }),
      })

      const data = await res.json()

      if (data.success) {
        addToast({ type: 'success', title: t('auth.registerSuccess'), description: t('auth.welcomeJoin') })
        router.push('/dashboard')
      } else {
        const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || t('auth.registerFailed')
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
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2">
            <Mail className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-gray-900">OutreachHub</span>
          </Link>

          <div className="mt-12">
            <h1 className="text-2xl font-bold text-gray-900">{t('auth.createAccount')}</h1>
            <p className="mt-2 text-sm text-gray-500">{t('auth.registerSubtitle')}</p>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('auth.name')}</label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t('auth.namePlaceholder')}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">{t('auth.email')}</label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700">{t('auth.company')}</label>
              <input
                id="company"
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t('auth.companyPlaceholder')}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">{t('auth.password')}</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t('auth.passwordMinLengthHint')}
                disabled={loading}
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>
                我已阅读并同意{' '}
                <Link href="/terms" target="_blank" className="text-primary hover:underline">《服务条款》</Link>
                和{' '}
                <Link href="/privacy" target="_blank" className="text-primary hover:underline">《隐私政策》</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !consented}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? t('auth.registering') : t('auth.register')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t('auth.hasAccount')}{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary/80">{t('auth.loginNow')}</Link>
          </p>
        </div>
      </div>

      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="mx-auto max-w-md text-white">
          <h2 className="text-3xl font-bold">{t('register.branding.title')}</h2>
          <div className="mt-8 rounded-xl bg-white/10 p-6 backdrop-blur-sm">
            <h3 className="text-xl font-semibold">{t('register.branding.freeIncludes')}</h3>
            <ul className="mt-4 space-y-3 text-sm text-blue-100">
              <li className="flex items-center gap-2">&#10003; {t('register.branding.feature1')}</li>
              <li className="flex items-center gap-2">&#10003; {t('register.branding.feature2')}</li>
              <li className="flex items-center gap-2">&#10003; {t('register.branding.feature3')}</li>
              <li className="flex items-center gap-2">&#10003; {t('register.branding.feature4')}</li>
              <li className="flex items-center gap-2">&#10003; {t('register.branding.feature5')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}