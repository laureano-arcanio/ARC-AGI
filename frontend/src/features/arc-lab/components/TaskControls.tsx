import { useRef } from 'react'

type TaskControlsProps = {
  taskName: string | null
  taskIndex: number | null
  taskTotal: number | null
  showSymbolNumbers: boolean
  onShowSymbolNumbersChange: (value: boolean) => void
  onLoadFile: (file: File) => void
  onRandomTask: () => void
  isFetchingRandom?: boolean
}

export function TaskControls({
  taskName,
  taskIndex,
  taskTotal,
  showSymbolNumbers,
  onShowSymbolNumbersChange,
  onLoadFile,
  onRandomTask,
  isFetchingRandom = false,
}: TaskControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onLoadFile(file)
    e.target.value = ''
  }

  const nameSuffix =
    taskIndex === null || taskTotal === null
      ? ''
      : `${taskIndex} out of ${taskTotal}`

  return (
    <div
      data-testid="task-controls"
      className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3"
    >
      <input
        ref={fileInputRef}
        type="file"
        data-testid="load-task-file"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          data-testid="browse-btn"
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white"
        >
          Browse...
        </button>
        <button
          type="button"
          onClick={onRandomTask}
          data-testid="random-task-btn"
          disabled={isFetchingRandom}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isFetchingRandom ? 'Loading...' : 'Random...'}
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={showSymbolNumbers}
              onChange={(e) => onShowSymbolNumbersChange(e.target.checked)}
              data-testid="show-symbol-numbers"
              className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-blue-600 accent-blue-600"
            />
            Show numbers
          </label>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        <span data-testid="task-name">
          {taskName ? (
            <>
              <span className="text-gray-400">Task:</span> {taskName}
              {nameSuffix && <span className="ml-2 text-gray-600">({nameSuffix})</span>}
            </>
          ) : (
            'No task loaded'
          )}
        </span>
      </div>
    </div>
  )
}
