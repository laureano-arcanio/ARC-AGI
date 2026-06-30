import { useEffect, useRef, useState } from 'react'
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
  onMoveSelection?: (dx: number, dy: number) => void
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
  onMoveSelection,
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
  const isMovingRef = useRef(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const hasDragRef = useRef(false)
  const toolModeRef = useRef(toolMode)
  toolModeRef.current = toolMode

  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number } | null>(null)

  useEffect(() => {
    const handleMouseUp = () => {
      if (dragStartRef.current) {
        if (isMovingRef.current && hasDragRef.current && dragOffset) {
          onMoveSelection?.(dragOffset.dx, dragOffset.dy)
        } else if (!hasDragRef.current) {
          if (toolModeRef.current === 'edit') {
            onSelectionChange(new Set([cellKey(dragStartRef.current.x, dragStartRef.current.y)]))
            onToolModeChange?.('select')
          } else if (toolModeRef.current === 'select') {
            onSelectionChange(new Set([cellKey(dragStartRef.current.x, dragStartRef.current.y)]))
          } else {
            onCellClick(dragStartRef.current.x, dragStartRef.current.y)
          }
        } else if (toolModeRef.current === 'area_select') {
          onCellClick(dragStartRef.current.x, dragStartRef.current.y)
        }
      }
      isMouseDownRef.current = false
      isSelectingRef.current = false
      isMovingRef.current = false
      dragStartRef.current = null
      hasDragRef.current = false
      setDragOffset(null)
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [onCellClick, onToolModeChange, onSelectionChange, onMoveSelection, dragOffset])

  const handleMouseDown = (x: number, y: number) => {
    if (readOnly) return
    isMouseDownRef.current = true
    dragStartRef.current = { x, y }
    hasDragRef.current = false

    if (toolMode === 'select' && selectedCells.has(cellKey(x, y))) {
      isMovingRef.current = true
    } else if (toolMode === 'select' || toolMode === 'area_select') {
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
    } else if (toolMode === 'select' && isMovingRef.current && dragStartRef.current) {
      hasDragRef.current = true
      setDragOffset({ dx: x - dragStartRef.current.x, dy: y - dragStartRef.current.y })
    } else if (toolMode === 'select' && isSelectingRef.current) {
      hasDragRef.current = true
      if (dragStartRef.current) {
        onSelectionChange(new Set([
          cellKey(dragStartRef.current.x, dragStartRef.current.y),
          cellKey(x, y),
          ...selectedCells,
        ]))
      }
    } else if (toolMode === 'area_select' && isSelectingRef.current && dragStartRef.current) {
      hasDragRef.current = true
      const start = dragStartRef.current
      const minX = Math.min(start.x, x)
      const maxX = Math.max(start.x, x)
      const minY = Math.min(start.y, y)
      const maxY = Math.max(start.y, y)
      const rect = new Set<string>()
      for (let i = minX; i <= maxX; i++) {
        for (let j = minY; j <= maxY; j++) {
          rect.add(cellKey(i, j))
        }
      }
      onSelectionChange(rect)
    }
  }

  const ghostKeys = new Set<string>()
  const ghostSource = new Map<string, { x: number; y: number }>()
  if (dragOffset && selectedCells.size > 0) {
    for (const key of selectedCells) {
      const { x, y } = parseKey(key)
      const gx = x + dragOffset.dx
      const gy = y + dragOffset.dy
      if (gx >= 0 && gx < height && gy >= 0 && gy < width) {
        const gk = cellKey(gx, gy)
        ghostKeys.add(gk)
        ghostSource.set(gk, { x, y })
      }
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
            const source = ghostSource.get(key)
            return (
              <GridCell
                key={j}
                x={i}
                y={j}
                symbol={source ? grid[source.x]?.[source.y] ?? symbol : symbol}
                size={cellSize}
                showNumber={showNumbers}
                selected={selectedCells.has(key)}
                isGhost={ghostKeys.has(key)}
                isMovingAway={Boolean(dragOffset) && selectedCells.has(key)}
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

function parseKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(',').map(Number)
  return { x, y }
}
