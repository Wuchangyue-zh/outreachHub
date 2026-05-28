'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      title={`当前: ${theme === 'system' ? '跟随系统' : theme === 'dark' ? '深色模式' : '浅色模式'}`}
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
      <span className="sr-only">切换主题</span>
    </button>
  )
}
