import { useEffect, useRef } from 'react'
import { GridCell } from './GridCell'
import { cellKey, computeCellSize, gridHeight, gridWidth } from '../utils'
import type { ToolMode } from '../types'

type EditableGridProps = {
  grid: number[][]
  toolMode: ToolMode
  showNumbers: boolean
  selectedCells: Set<string>
  containerSize?: number
  maxCellSize?: number
  onCellClick: (x: number, y: number) => void
  onSelectionChange: (cells: Set<string>) => void
}

export function EditableGrid({
  grid,
  toolMode,
  showNumbers,
  selectedCells,
  containerSize = 500,
  maxCellSize = 100,
  onCellClick,
  onSelectionChange,
}: EditableGridProps) {
  const height = gridHeight(grid)
  const width = gridWidth(grid)
  const cellSize = computeCellSize(
    height,
    width,
    containerSize,
    containerSize,
    maxCellSize,
  )

  const isSelectingRef = useRef(false)

  useEffect(() => {
    const endSelection = () => {
      isSelectingRef.current = false
    }
    window.addEventListener('mouseup', endSelection)
    return () => window.removeEventListener('mouseup', endSelection)
  }, [])

  const handleCellClick = (x: number, y: number) => {
    if (toolMode === 'edit' || toolMode === 'floodfill') {
      onCellClick(x, y)
    }
  }

  const handleMouseDown = (x: number, y: number) => {
    if (toolMode !== 'select') return
    isSelectingRef.current = true
    onSelectionChange(new Set([cellKey(x, y)]))
  }

  const handleMouseEnter = (x: number, y: number) => {
    if (toolMode !== 'select' || !isSelectingRef.current) return
    onSelectionChange(new Set([...selectedCells, cellKey(x, y)]))
  }

  return (
    <div
      data-testid="editable-grid"
      className="inline-block rounded border border-gray-800"
      onMouseLeave={() => {
        isSelectingRef.current = false
      }}
    >
      {grid.map((row, i) => (
        <div key={i} className="flex">
          {row.map((symbol, j) => {
            const key = cellKey(i, j)
            return (
              <GridCell
                key={j}
                x={i}
                y={j}
                symbol={symbol}
                size={cellSize}
                showNumber={showNumbers}
                selected={selectedCells.has(key)}
                onClick={handleCellClick}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
