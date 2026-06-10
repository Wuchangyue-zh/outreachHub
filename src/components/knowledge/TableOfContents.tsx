'use client'

import { useEffect, useState } from 'react'
import { ListTree } from 'lucide-react'
import { useActiveHeading } from '@/hooks/useReadingProgress'
import { useI18n } from '@/hooks/use-i18n'

interface Heading { id: string; text: string; level: number }

export function TableOfContents({ content: _content }: { content: string }) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const { t } = useI18n()

  // Extract headings from the actual DOM after hydration
  useEffect(() => {
    const articleBody = document.querySelector('[data-article-body]')
    if (!articleBody) return
    const headingEls = articleBody.querySelectorAll('h2, h3')
    const result: Heading[] = []
    headingEls.forEach((h, i) => {
      const id = `section-${i}`
      h.id = id
      result.push({ id, text: h.textContent || '', level: h.tagName === 'H3' ? 3 : 2 })
    })
    setHeadings(result)
  }, [])

  const headingIds = headings.map((h) => h.id)
  const activeId = useActiveHeading(headingIds)

  if (headings.length === 0) return null

  return (
    <nav className="sticky top-24 w-full" aria-label="Table of contents">
      <div className="rounded-2xl border border-gray-100 bg-white/80 p-5 backdrop-blur-sm">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          <ListTree className="h-3.5 w-3.5" />
          {t('knowledge.tocTitle')}
        </div>

        {/* Headings list */}
        <ul className="space-y-1">
          {headings.map((h) => {
            const isActive = activeId === h.id
            return (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    const el = document.getElementById(h.id)
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      history.pushState(null, '', `#${h.id}`)
                    }
                  }}
                  className={`block rounded-lg px-2 py-1.5 text-sm transition-all duration-300 ${
                    h.level === 3 ? 'pl-6' : ''
                  } ${
                    isActive
                      ? 'bg-blue-50 font-semibold text-blue-700'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {h.text}
                </a>
              </li>
            )
          })}
        </ul>

        {/* Back to top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-100 px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:border-gray-200 hover:text-gray-700"
        >
          ↑ {t('knowledge.backToTop')}
        </button>
      </div>
    </nav>
  )
}
