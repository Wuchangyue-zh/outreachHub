'use client'

import { useEffect, useState } from 'react'

interface ArticleContentProps {
  html: string
}

/**
 * Renders article HTML content with rich styling:
 * - Blue accent bars on H2 section headers
 * - Icon badges on H3 subsections
 * - Card-style feature lists (UL with <strong> first items)
 * - Numbered step cards (OL)
 * - Styled paragraphs
 */
export function ArticleContent({ html }: ArticleContentProps) {
  const [processedHtml, setProcessedHtml] = useState('')

  useEffect(() => {
    setProcessedHtml(processContent(html))
  }, [html])

  return (
    <>
      <style>{articleProseStyles}</style>
      <div
        data-article-body
        className="article-prose"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    </>
  )
}

const articleProseStyles = `
.article-prose code {
  background: #f3f4f6;
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 0.875rem;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  color: #1e40af;
}
.article-prose a {
  color: #2563eb;
  text-decoration: none;
}
.article-prose a:hover {
  text-decoration: underline;
}
.article-prose strong {
  color: #111827;
  font-weight: 600;
}
.article-prose ul {
  list-style: disc;
  padding-left: 1.25rem;
}
.article-prose ol {
  list-style: decimal;
  padding-left: 1.25rem;
}
`

function processContent(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const body = doc.body
  const children = Array.from(body.children)
  let processed = ''

  for (let i = 0; i < children.length; i++) {
    const el = children[i]

    // ── H2 → section header with blue accent bar ──
    if (el.tagName === 'H2') {
      el.className = 'group relative flex items-start gap-3 text-2xl font-bold text-gray-900 mt-14 mb-6'
      const text = el.innerHTML
      el.innerHTML = `
        <span class="mt-1.5 flex h-6 w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600"></span>
        <span>${text}</span>
      `
      processed += el.outerHTML
      continue
    }

    // ── H3 → subsection with letter badge ──
    if (el.tagName === 'H3') {
      el.className = 'text-xl font-semibold text-gray-800 mt-8 mb-4 flex items-center gap-2'
      const text = el.innerHTML
      el.innerHTML = `
        <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600 border border-blue-100">${text.charAt(0)}</span>
        <span>${text}</span>
      `
      processed += el.outerHTML
      continue
    }

    // ── UL: detect "bold-first" pattern → card-style feature list ──
    if (el.tagName === 'UL') {
      const items = Array.from(el.querySelectorAll('li'))
      const hasBold = items.some(li => li.querySelector('strong:first-child') || li.querySelector('b:first-child'))

      if (hasBold) {
        const cardsHtml = items.map(li => {
          const strong = li.querySelector('strong') || li.querySelector('b')
          const boldText = strong?.textContent || ''
          if (strong) strong.remove()
          const restText = li.textContent?.replace(/^[\s:—–-]+/, '').trim() || ''

          return `
            <div class="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
              <span class="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-bold text-white shadow-sm">✓</span>
              <div>
                <p class="text-sm font-semibold text-gray-900">${boldText}</p>
                ${restText ? `<p class="mt-0.5 text-sm text-gray-500">${restText}</p>` : ''}
              </div>
            </div>
          `
        }).join('')

        processed += `<div class="mt-4 space-y-2.5">${cardsHtml}</div>`
        continue
      }

      // Regular bullet list
      processed += `
        <ul class="my-4 space-y-2 pl-2 text-base text-gray-600">
          ${items.map(li => `<li class="flex items-start gap-2 before:mt-2 before:flex before:h-1.5 before:w-1.5 before:flex-shrink-0 before:rounded-full before:bg-blue-400"><span>${li.innerHTML}</span></li>`).join('')}
        </ul>
      `
      continue
    }

    // ── OL → numbered step cards ──
    if (el.tagName === 'OL') {
      const items = Array.from(el.querySelectorAll('li'))
      const cardsHtml = items.map((li, idx) => {
        return `
          <div class="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
            <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-lg">${idx + 1}</span>
            <div class="text-sm leading-relaxed text-gray-700">${li.innerHTML}</div>
          </div>
        `
      }).join('')

      processed += `<div class="mt-4 space-y-2.5">${cardsHtml}</div>`
      continue
    }

    // ── P → styled paragraph ──
    if (el.tagName === 'P') {
      // Check if it's a Q&A style paragraph
      if (el.innerHTML.startsWith('<strong>Q:') || el.innerHTML.startsWith('<b>Q:')) {
        el.className = 'mt-5 rounded-xl bg-amber-50/50 border border-amber-100 p-5 text-sm leading-relaxed'
        processed += el.outerHTML
        continue
      }

      el.className = 'mt-4 text-base leading-relaxed text-gray-600'
      processed += el.outerHTML
      continue
    }

    // ── Default: pass through ──
    processed += el.outerHTML
  }

  return processed
}
