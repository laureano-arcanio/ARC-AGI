import { useTranslation } from '../../../lib/i18n'

type TaskControlsProps = {
  onNextTask: () => void
}

export function TaskControls({
  onNextTask,
}: TaskControlsProps) {
  const { t } = useTranslation()

  return (
    <div
      data-testid="task-controls"
      className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNextTask}
          data-testid="next-task-btn"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
        >
          {t('button.next_task')}
        </button>
      </div>
    </div>
  )
}
