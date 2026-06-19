import { useEffect } from 'react'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'default'
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const confirmClasses =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
      : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500'

  return (
    <div
      data-testid="confirm-dialog"
      data-variant={variant}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        data-testid="confirm-dialog-backdrop"
        className="absolute inset-0"
        onClick={onCancel}
      />
      <div
        data-testid="confirm-dialog-panel"
        className="relative w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-xl"
      >
        <h2
          id="confirm-dialog-title"
          data-testid="confirm-dialog-title"
          className="text-sm font-semibold text-gray-100"
        >
          {title}
        </h2>
        <p
          data-testid="confirm-dialog-message"
          className="mt-2 text-sm leading-relaxed text-gray-400"
        >
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            data-testid="confirm-dialog-cancel"
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="confirm-dialog-confirm"
            className={`rounded-md px-4 py-1.5 text-xs font-semibold text-white transition focus:outline-none focus-visible:ring-2 ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
