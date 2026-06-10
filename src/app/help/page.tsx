'use client'

import { useState } from 'react'
import Link from 'next/link'
import { faqData } from '@/lib/landing-data'
import { useI18n } from '@/hooks/use-i18n'
import { ChevronDown, Mail, ArrowLeft } from 'lucide-react'

export default function HelpPage() {
  const { t } = useI18n()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">OutreachHub</Link>
          <Link href="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> {t('help.backToHome')}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">{t('help.title')}</h1>
        <p className="mt-2 text-gray-600">{t('help.subtitle')}</p>

        <div className="mt-10 space-y-3">
          {faqData.items.map((item, i) => (
            <div key={i} className="rounded-lg border">
              <button
                className="flex w-full items-center justify-between px-6 py-4 text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="font-medium">{item.question}</span>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              {openIndex === i && (
                <div className="border-t px-6 py-4 text-gray-600">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-gray-50 p-8 text-center dark:bg-gray-900">
          <Mail className="mx-auto h-8 w-8 text-gray-400" />
          <h3 className="mt-3 text-lg font-semibold">{t('help.noAnswer')}</h3>
          <p className="mt-1 text-gray-600">{t('help.contactSupport')}</p>
          <a href="mailto:support@outreachhub.com" className="mt-4 inline-block text-primary hover:underline">
            support@outreachhub.com
          </a>
        </div>
      </main>
    </div>
  )
}
