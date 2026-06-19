import { useCallback, useRef } from 'react'
import { INACTIVITY_THRESHOLD_MS, INTERCEPT_BLOCK_MS } from '../types'

type UsePauseInterceptionOptions = {
  onIntercept: () => void
}

export function usePauseInterception({ onIntercept }: UsePauseInterceptionOptions) {
  const lastActivityRef = useRef<number>(Date.now())
  const interceptUntilRef = useRef<number>(0)
  const onInterceptRef = useRef(onIntercept)
  onInterceptRef.current = onIntercept

  const reset = useCallback(() => {
    lastActivityRef.current = Date.now()
    interceptUntilRef.current = 0
  }, [])

  const interceptAction = useCallback((): boolean => {
    const now = Date.now()

    if (now < interceptUntilRef.current) {
      return true
    }

    const idleMs = now - lastActivityRef.current
    if (idleMs >= INACTIVITY_THRESHOLD_MS) {
      interceptUntilRef.current = now + INTERCEPT_BLOCK_MS
      lastActivityRef.current = now
      onInterceptRef.current()
      return true
    }

    lastActivityRef.current = now
    return false
  }, [])

  return { reset, interceptAction }
}
