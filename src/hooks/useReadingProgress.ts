'use client'

import { useEffect, useState, useCallback } from 'react'

/**
 * Hook: tracks reading progress as a percentage (0-100).
 * Measures scroll position relative to the article content.
 */
export function useReadingProgress(articleRef: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0)

  const updateProgress = useCallback(() => {
    const el = articleRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const totalHeight = rect.height + rect.top
    const scrolled = window.scrollY
    setProgress(Math.min(Math.max((scrolled / totalHeight) * 100, 0), 100))
  }, [articleRef])

  useEffect(() => {
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [updateProgress])

  return progress
}

/**
 * Hook: tracks which heading is currently visible in the viewport.
 * Returns the ID of the active heading.
 */
export function useActiveHeading(headingIds: string[]) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    )

    for (const id of headingIds) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [headingIds])

  return activeId
}
