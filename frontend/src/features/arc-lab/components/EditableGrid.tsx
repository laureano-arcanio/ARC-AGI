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
  readOnly?: boolean
  onCellClick: (x: number, y: number) => void
  onSelectionChange: (cells: Set<string>) => void
  onToolModeChange?: (mode: ToolMode) => void
}

export function EditableGrid({
  grid,
  toolMode,
  showNumbers,
  selectedCells,
  containerSize = 500,
  maxCellSize = 100,
  readOnly = false,
  onCellClick,
  onSelectionChange,
  onToolModeChange,
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
  const isMouseDownRef = useRef(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const hasDragRef = useRef(false)
  const toolModeRef = useRef(toolMode)
  toolModeRef.current = toolMode

  useEffect(() => {
    const handleMouseUp = () => {
      if (dragStartRef.current && !hasDragRef.current) {
        if (toolModeRef.current !== 'select') {
          onCellClick(dragStartRef.current.x, dragStartRef.current.y)
        }
      }
      isMouseDownRef.current = false
      isSelectingRef.current = false
      dragStartRef.current = null
      hasDragRef.current = false
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [onCellClick])

  const handleMouseDown = (x: number, y: number) => {
    if (readOnly) return
    isMouseDownRef.current = true
    dragStartRef.current = { x, y }
    hasDragRef.current = false

    if (toolMode === 'select') {
      isSelectingRef.current = true
      onSelectionChange(new Set([cellKey(x, y)]))
    }
  }

  const handleMouseEnter = (x: number, y: number) => {
    if (readOnly) return
    if (!isMouseDownRef.current) return

    if (toolMode === 'edit' && dragStartRef.current) {
      const start = dragStartRef.current
      if (start.x !== x || start.y !== y) {
        hasDragRef.current = true
        onToolModeChange?.('select')
        isSelectingRef.current = true
        onSelectionChange(new Set([cellKey(start.x, start.y), cellKey(x, y)]))
      }
    } else if (toolMode === 'select' && isSelectingRef.current) {
      onSelectionChange(new Set([...selectedCells, cellKey(x, y)]))
    }
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
