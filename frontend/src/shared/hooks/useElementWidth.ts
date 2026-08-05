import { useEffect, useRef, useState } from 'react'

export function useElementWidth<T extends HTMLElement = HTMLDivElement>(initial = 0): {
  ref: React.RefObject<T | null>
  width: number
} {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(initial)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof ResizeObserver === 'undefined') return
    let raf = 0
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setWidth(w))
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return { ref, width }
}
