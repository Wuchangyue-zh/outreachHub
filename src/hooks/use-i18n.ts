'use client'

import { useState, useEffect } from 'react'
import { t, getLocale, setLocale, type Locale } from '@/lib/i18n'

export function useI18n() {
  const [locale, setCurrentLocale] = useState<Locale>(getLocale)

  useEffect(() => {
    setCurrentLocale(getLocale())
  }, [])

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale)
    setCurrentLocale(newLocale)
  }

  const translate = (key: string) => t(key, locale)

  return {
    locale,
    setLocale: changeLocale,
    t: translate,
  }
}
