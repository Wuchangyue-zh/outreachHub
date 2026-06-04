'use client'

import { useEffect } from 'react'

/**
 * Intercepts clicks on <a href="#..."> links within the current page
 * and scrolls smoothly with a 64px offset for the fixed navbar.
 */
export function SmoothScroll() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || !href.startsWith('#')) return

      const id = href.slice(1)
      if (!id) return

      const el = document.getElementById(id)
      if (!el) return

      e.preventDefault()
      const y = el.getBoundingClientRect().top + window.scrollY - 72
      window.scrollTo({ top: y, behavior: 'smooth' })

      // Update URL without triggering a reload
      history.pushState(null, '', href)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return null
}
