import { useEffect, useRef } from 'react'
import { GridCell } from '../../arc-lab/components/GridCell'
import { cellKey, getConnectedComponent, selectObject } from '../../arc-lab/utils'
import type { TagMode } from '../types'

type TaggableGridProps = {
  grid: number[][]
  tagMode: TagMode
  selectedCells: Set<string>
  taggedCellKeys?: Set<string>
  cellSize?: number
  onSelectionChange: (cells: Set<string>) => void
}

function mergeWithCtrl(
  newCells: Set<string>,
  existing: Set<string>,
  ctrlHeld: boolean,
): Set<string> {
  if (!ctrlHeld) return newCells
  const merged = new Set(existing)
  for (const key of newCells) {
    merged.add(key)
  }
  return merged
}

export function TaggableGrid({
  grid,
  tagMode,
  selectedCells,
  taggedCellKeys,
  cellSize = 30,
  onSelectionChange,
}: TaggableGridProps) {
  const isSelectingRef = useRef(false)
  const isMouseDownRef = useRef(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const hasDragRef = useRef(false)
  const anchorRef = useRef<{ x: number; y: number } | null>(null)
  const tagModeRef = useRef(tagMode)
  tagModeRef.current = tagMode
  const selectedCellsRef = useRef(selectedCells)
  selectedCellsRef.current = selectedCells
  const ctrlHeldRef = useRef(false)

  useEffect(() => {
    const handleMouseUp = () => {
      if (!dragStartRef.current) {
        isMouseDownRef.current = false
        isSelectingRef.current = false
        hasDragRef.current = false
        return
      }

      const start = dragStartRef.current

      if (!hasDragRef.current) {
        const ctrl = ctrlHeldRef.current
        if (tagModeRef.current === 'object_select') {
          const obj = selectObject(grid, start.x, start.y, false)
          onSelectionChange(mergeWithCtrl(obj, selectedCellsRef.current, ctrl))
        } else if (tagModeRef.current === 'floodfill_select') {
          const cells = getConnectedComponent(grid, start.x, start.y)
          onSelectionChange(mergeWithCtrl(cells, selectedCellsRef.current, ctrl))
        } else if (tagModeRef.current === 'color_select') {
          const target = grid[start.x]?.[start.y]
          if (target !== undefined) {
            const sameColor = new Set<string>()
            for (let i = 0; i < grid.length; i++) {
              for (let j = 0; j < grid[i].length; j++) {
                if (grid[i][j] === target) {
                  sameColor.add(cellKey(i, j))
                }
              }
            }
            onSelectionChange(mergeWithCtrl(sameColor, selectedCellsRef.current, ctrl))
          }
        } else if (tagModeRef.current === 'select') {
          const key = cellKey(start.x, start.y)
          onSelectionChange(mergeWithCtrl(new Set([key]), selectedCellsRef.current, ctrl))
        } else {
          const key = cellKey(start.x, start.y)
          onSelectionChange(mergeWithCtrl(new Set([key]), selectedCellsRef.current, ctrl))
        }
      } else if (tagModeRef.current === 'area_select') {
        // already handled in mouseEnter
      }

      isMouseDownRef.current = false
      isSelectingRef.current = false
      hasDragRef.current = false
      dragStartRef.current = null
    }

    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [grid, onSelectionChange])

  const handleMouseDown = (x: number, y: number, e: React.MouseEvent) => {
    if (e.shiftKey && tagMode === 'select' && anchorRef.current) {
      const anchor = anchorRef.current
      const minX = Math.min(anchor.x, x)
      const maxX = Math.max(anchor.x, x)
      const minY = Math.min(anchor.y, y)
      const maxY = Math.max(anchor.y, y)
      const rect = new Set<string>()
      for (let i = minX; i <= maxX; i++) {
        for (let j = minY; j <= maxY; j++) {
          rect.add(cellKey(i, j))
        }
      }
      onSelectionChange(rect)
      return
    }

    isMouseDownRef.current = true
    dragStartRef.current = { x, y }
    hasDragRef.current = false

    if (e.ctrlKey || e.metaKey) {
      ctrlHeldRef.current = true
      if (tagMode === 'object_select' || tagMode === 'color_select' || tagMode === 'floodfill_select') {
        return
      }
      const key = cellKey(x, y)
      const newSelection = new Set(selectedCellsRef.current)
      if (newSelection.has(key)) {
        newSelection.delete(key)
      } else {
        newSelection.add(key)
      }
      onSelectionChange(newSelection)
      isMouseDownRef.current = false
      dragStartRef.current = null
      return
    }

    ctrlHeldRef.current = false
    anchorRef.current = { x, y }

    if (tagMode === 'object_select' || tagMode === 'color_select' || tagMode === 'floodfill_select') {
      return
    }

    if (tagMode === 'select' || tagMode === 'area_select') {
      isSelectingRef.current = true
      onSelectionChange(new Set([cellKey(x, y)]))
    }
  }

  const handleMouseEnter = (x: number, y: number) => {
    if (!isMouseDownRef.current) return
    hasDragRef.current = true

    if (tagMode === 'select' && isSelectingRef.current && dragStartRef.current) {
      const newSelection = new Set(selectedCellsRef.current)
      newSelection.add(cellKey(x, y))
      onSelectionChange(newSelection)
    } else if (tagMode === 'area_select' && isSelectingRef.current && dragStartRef.current) {
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
      onSelectionChange(mergeWithCtrl(rect, selectedCellsRef.current, ctrlHeldRef.current))
    }
  }

  return (
    <div
      className="inline-block rounded border border-gray-800"
      onMouseLeave={() => {
        isSelectingRef.current = false
      }}
    >
      {grid.map((row, i) => (
        <div key={i} className="flex">
          {row.map((symbol, j) => {
            const key = cellKey(i, j)
            const isSelected = selectedCells.has(key)
            const isTagged = taggedCellKeys?.has(key) ?? false
            return (
              <div key={j} className="relative">
                <GridCell
                  x={i}
                  y={j}
                  symbol={symbol}
                  size={cellSize}
                  selected={isSelected}
                  onMouseDown={handleMouseDown}
                  onMouseEnter={handleMouseEnter}
                />
                {isTagged && !isSelected && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-sm"
                    style={{
                      boxShadow: 'inset 0 0 0 1px rgba(99, 102, 241, 0.5)',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
