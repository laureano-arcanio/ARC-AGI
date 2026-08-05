import { GridCell } from './GridCell'
import { computeCellSize, gridHeight, gridWidth } from '../utils'

type GridDisplayProps = {
  grid: number[][]
  showNumbers?: boolean
  containerSize?: number
  maxCellSize?: number
}

export function GridDisplay({
  grid,
  showNumbers = false,
  containerSize = 200,
  maxCellSize = 100,
}: GridDisplayProps) {
  const height = gridHeight(grid)
  const cols = gridWidth(grid)
  const cap = Math.max(1, computeCellSize(height, cols, containerSize, containerSize, maxCellSize))

  return (
    <div data-testid="grid-display" className="w-full">
      <div
        className="mx-auto rounded border border-gray-800"
        style={{ width: 'fit-content' }}
      >
        {grid.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, minmax(0, ${cap}px))`,
            }}
          >
            {row.map((symbol, j) => (
              <GridCell
                key={j}
                x={i}
                y={j}
                symbol={symbol}
                showNumber={showNumbers}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
