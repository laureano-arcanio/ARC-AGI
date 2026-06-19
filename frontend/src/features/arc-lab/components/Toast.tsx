import { useEffect } from 'react'
import type { ToastMessage } from '../types'

type ToastProps = {
  message: ToastMessage | null
  durationMs?: number
  onDismiss: () => void
}

export function Toast({ message, durationMs = 5000, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(timer)
  }, [message, durationMs, onDismiss])

  if (!message) return null

  const isError = message.kind === 'error'

  return (
    <div
      data-testid="toast"
      data-kind={message.kind}
      role={isError ? 'alert' : 'status'}
      className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
        isError
          ? 'border-red-800 bg-red-950/50 text-red-400'
          : 'border-green-800 bg-green-950/50 text-green-400'
      }`}
    >
      {message.text}
    </div>
  )
}
