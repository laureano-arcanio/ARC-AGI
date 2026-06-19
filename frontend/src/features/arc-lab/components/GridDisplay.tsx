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
  const width = gridWidth(grid)
  const cellSize = computeCellSize(
    height,
    width,
    containerSize,
    containerSize,
    maxCellSize,
  )

  return (
    <div data-testid="grid-display" className="inline-block rounded border border-gray-800">
      {grid.map((row, i) => (
        <div key={i} className="flex">
          {row.map((symbol, j) => (
            <GridCell
              key={j}
              x={i}
              y={j}
              symbol={symbol}
              size={cellSize}
              showNumber={showNumbers}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
