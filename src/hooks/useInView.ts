'use client'

import { useEffect, useState, useRef } from 'react'

/**
 * Hook: observe when an element enters the viewport.
 * Returns `true` once the element is visible (stays true by default).
 * Use `once: false` to toggle on each enter/leave cycle.
 */
export function useInView(options?: {
  threshold?: number
  once?: boolean
  rootMargin?: string
}): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const { threshold = 0.1, once = true, rootMargin } = options ?? {}

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.unobserve(el)
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, once, rootMargin])

  return [ref, inView]
}
