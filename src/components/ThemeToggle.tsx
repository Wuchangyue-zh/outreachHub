'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useI18n } from '@/hooks/use-i18n'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { t } = useI18n()

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const themeLabel = theme === 'system' ? t('theme.system') : theme === 'dark' ? t('theme.dark') : t('theme.light')

  return (
    <button
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      title={`${t('theme.toggle')}: ${themeLabel}`}
    >
      {theme === 'light' && (
        <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      )}
      {theme === 'dark' && (
        <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      )}
      {theme === 'system' && (
        <Monitor className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      )}
      <span className="sr-only">{t('theme.toggle')}</span>
    </button>
  )
}
