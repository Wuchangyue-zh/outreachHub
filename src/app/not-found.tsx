'use client'

import Link from 'next/link'
import { useI18n } from '@/hooks/use-i18n'

export default function NotFound() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-blue-100 rounded-full">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          {t('notFound.title')}
        </h2>
        <p className="mt-2 text-gray-600">
          {t('notFound.description')}
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            {t('notFound.goHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
