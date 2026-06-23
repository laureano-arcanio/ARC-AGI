import { GridDisplay } from './GridDisplay'

type TestInputPanelProps = {
  input: number[][]
  showNumbers?: boolean
}

export function TestInputPanel({
  input,
  showNumbers = false,
}: TestInputPanelProps) {
  return (
    <div
      data-testid="test-input-panel"
      className="overflow-hidden rounded-xl"
    >
      <div className="flex justify-center px-4 py-4" data-testid="evaluation-input">
        <GridDisplay grid={input} showNumbers={showNumbers} containerSize={500} maxCellSize={120} />
      </div>

    </div>
  )
}
