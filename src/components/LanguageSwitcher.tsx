'use client'

import { useI18n } from '@/hooks/use-i18n'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <button
      onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
      className="relative h-9 w-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      <Globe className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      <span className="sr-only">{locale === 'zh' ? 'EN' : '中'}</span>
    </button>
  )
}
