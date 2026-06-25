import { useEffect } from 'react'
import { useTranslation } from '../../lib/i18n'

export type InstructionModalProps = {
  open: boolean
  onDismiss: () => void
}

export function InstructionModal({ open, onDismiss }: InstructionModalProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onDismiss])

  if (!open) return null

  return (
    <div
      data-testid="instruction-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="instruction-modal-title"
    >
      <div
        data-testid="instruction-modal-backdrop"
        className="absolute inset-0"
        onClick={onDismiss}
      />
      <div
        data-testid="instruction-modal-panel"
        className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-xl"
      >
        <h2
          id="instruction-modal-title"
          data-testid="instruction-modal-title"
          className="text-lg font-bold text-gray-100"
        >
          {t('instruction.title')}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          {t('instruction.intro')}
        </p>

        <ol className="mt-4 space-y-3">
          <li className="text-sm leading-relaxed text-gray-300">
            <span className="font-semibold text-gray-100">{t('instruction.step1_label')}</span>
            {' — '}
            {t('instruction.step1_desc')}
          </li>
          <li className="text-sm leading-relaxed text-gray-300">
            <span className="font-semibold text-gray-100">{t('instruction.step2_label')}</span>
            {' — '}
            {t('instruction.step2_desc')}
          </li>
          <li className="text-sm leading-relaxed text-gray-300">
            <span className="font-semibold text-gray-100">{t('instruction.step3_label')}</span>
            {' — '}
            {t('instruction.step3_desc')}
          </li>
        </ol>

        <div className="mt-5 space-y-3">
          <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-3">
            <p className="text-sm font-semibold text-gray-100">{t('instruction.undo_title')}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-400">
              {t('instruction.undo_desc')}
            </p>
          </div>

          <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-3">
            <p className="text-sm font-semibold text-gray-100">{t('instruction.actions_title')}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-400">
              {t('instruction.actions_desc')}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-yellow-700/40 bg-yellow-900/20 p-3">
          <p className="text-sm leading-relaxed text-yellow-200">
            {t('instruction.emphasis')}
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            data-testid="instruction-modal-dismiss"
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t('instruction.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
