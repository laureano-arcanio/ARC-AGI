import { useRef } from 'react'

type TaskModalProps = {
  open: boolean
  onLoadFile: (file: File) => void
  onRandomTask: () => void
  isFetchingRandom?: boolean
}

export function TaskModal({
  open,
  onLoadFile,
  onRandomTask,
  isFetchingRandom = false,
}: TaskModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onLoadFile(file)
    e.target.value = ''
  }

  return (
    <div
      data-testid="modal-bg"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm"
      style={{ paddingTop: 100 }}
    >
      <div
        data-testid="modal"
        className="w-[520px] rounded-xl border border-gray-800 bg-gray-900 p-12 text-center shadow-2xl"
      >
        <h2 className="mb-2 text-2xl font-bold text-gray-100">ARC Testing Interface</h2>
        <p className="mb-8 text-sm leading-relaxed text-gray-400">
          Choose a task file to start, or click "Random task" to load one from the ARC project on GitHub.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          data-testid="modal-load-task"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            data-testid="modal-browse-btn"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-gray-700"
          >
            Load task file...
          </button>
          <button
            type="button"
            onClick={onRandomTask}
            data-testid="modal-random-task"
            disabled={isFetchingRandom}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFetchingRandom ? 'Loading...' : 'Random task'}
          </button>
        </div>
      </div>
    </div>
  )
}
