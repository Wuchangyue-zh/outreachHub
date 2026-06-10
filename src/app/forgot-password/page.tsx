'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/hooks/use-i18n'
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError(t('forgotPassword.enterEmail'))
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
        setError(data.message || data.error?.message || t('forgotPassword.sendFailed'))
      }
    } catch {
      setError(t('forgotPassword.networkError'))
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
            <h1 className="text-2xl font-bold text-gray-900">{t('forgotPassword.title')}</h1>
            <p className="mt-2 text-sm text-gray-500">
              {t('forgotPassword.subtitle')}
            </p>
          </div>

          {sent ? (
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">{t('forgotPassword.emailSent')}</p>
                  <p className="mt-1 text-green-700">
                    {t('forgotPassword.emailSentDesc').replace('{email}', `<strong>${email}</strong>`).split('<strong>').map((part, i) => i === 0 ? part : <strong key={i}>{part.split('</strong>')[0]}</strong>)}
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('forgotPassword.backToLogin')}
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
                    {t('forgotPassword.emailLabel')}
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
                  {loading ? t('forgotPassword.sending') : t('forgotPassword.sendResetLink')}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                <Link href="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t('forgotPassword.backToLogin')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="mx-auto max-w-md text-white">
          <h2 className="text-3xl font-bold">{t('forgotPassword.secureReset')}</h2>
          <p className="mt-4 text-lg text-blue-100">
            {t('forgotPassword.secureResetDesc')}
          </p>
        </div>
      </div>
    </div>
  )
}
