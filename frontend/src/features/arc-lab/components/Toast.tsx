import { useEffect, useState } from 'react'
import type { ToastMessage } from '../types'

type ToastProps = {
  message: ToastMessage | null
  durationMs?: number
  onDismiss: () => void
}

export function Toast({ message, durationMs = 2000, onDismiss }: ToastProps) {
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!message) return
    setClosing(false)
    const timer = setTimeout(() => setClosing(true), durationMs)
    return () => clearTimeout(timer)
  }, [message, durationMs])

  useEffect(() => {
    if (!closing) return
    const timer = setTimeout(onDismiss, 300)
    return () => clearTimeout(timer)
  }, [closing, onDismiss])

  if (!message) return null

  const isError = message.kind === 'error'

  return (
    <div
      data-testid="toast"
      data-kind={message.kind}
      role={isError ? 'alert' : 'status'}
      className={`fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border px-4 py-3 text-sm shadow-lg transition-opacity duration-300 ${
        closing ? 'opacity-0' : 'opacity-100'
      } ${
        isError
          ? 'border-red-800 bg-red-950/50 text-red-400'
          : 'border-green-800 bg-green-950/50 text-green-400'
      }`}
    >
      {message.text}
    </div>
  )
}
