'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, Calendar, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'

export default function DemoPage() {
  const { t } = useI18n()
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email) {
      toast.error(t('demo.fillRequired'))
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setSubmitted(true)
      } else {
        toast.error(data.error?.message || t('demo.submitFailed'))
      }
    } catch {
      toast.error(t('demo.networkError'))
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <Card className="mx-4 max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="mt-4 text-2xl font-bold">{t('demo.successTitle')}</h1>
            <p className="mt-2 text-gray-600">{t('demo.successDesc')}</p>
            <Link href="/" className="mt-6 inline-block">
              <Button variant="outline">{t('demo.backToHome')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">OutreachHub</Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">{t('demo.login')}</Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-3xl font-bold">{t('demo.title')}</h1>
          <p className="mt-3 text-gray-600">{t('demo.subtitle')}</p>
        </div>

        <Card className="mt-10">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">{t('demo.name')} <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('demo.namePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">{t('demo.email')} <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="work@company.com"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">{t('demo.company')}</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder={t('demo.companyPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">{t('demo.phone')}</label>
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="138-0000-0000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">{t('demo.remarks')}</label>
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={t('demo.remarksPlaceholder')}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('demo.submitting')}</> : t('demo.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>{t('demo.contactUs')}</p>
          <div className="mt-2 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> sales@outreachhub.com</span>
            <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> 400-888-6688</span>
          </div>
        </div>
      </main>
    </div>
  )
}
