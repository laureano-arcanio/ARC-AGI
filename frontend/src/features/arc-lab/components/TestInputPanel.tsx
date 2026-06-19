import { GridDisplay } from './GridDisplay'

type TestInputPanelProps = {
  input: number[][]
  currentIndex: number
  total: number
  showNumbers?: boolean
  onNext: () => void
}

export function TestInputPanel({
  input,
  currentIndex,
  total,
  showNumbers = false,
  onNext,
}: TestInputPanelProps) {
  return (
    <div
      data-testid="test-input-panel"
      className="w-[420px] overflow-hidden rounded-xl border border-gray-800 bg-gray-900"
    >
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-800/50 px-4 py-3">
        <span className="text-sm font-semibold text-gray-200">
          Test input <span className="text-gray-400">{currentIndex + 1}/{total}</span>
        </span>
        <button
          type="button"
          onClick={onNext}
          data-testid="next-test-input"
          className="rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white"
        >
          Next test input
        </button>
      </div>
      <div className="p-4" data-testid="evaluation-input">
        <GridDisplay grid={input} showNumbers={showNumbers} containerSize={380} />
      </div>
    </div>
  )
}
