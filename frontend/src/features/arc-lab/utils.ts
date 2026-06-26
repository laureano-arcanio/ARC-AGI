import {
  DEFAULT_GRID_HEIGHT,
  DEFAULT_GRID_WIDTH,
  MAX_GRID_SIZE,
  type GridData,
} from './types'

export function createGrid(
  height: number = DEFAULT_GRID_HEIGHT,
  width: number = DEFAULT_GRID_WIDTH,
  values?: GridData,
): GridData {
  const grid: GridData = new Array(height)
  for (let i = 0; i < height; i++) {
    grid[i] = new Array(width)
    for (let j = 0; j < width; j++) {
      if (
        values !== undefined &&
        values[i] !== undefined &&
        values[i][j] !== undefined
      ) {
        grid[i][j] = values[i][j]
      } else {
        grid[i][j] = 0
      }
    }
  }
  return grid
}

export function cloneGrid(grid: GridData): GridData {
  return grid.map((row) => [...row])
}

export function gridHeight(grid: GridData): number {
  return grid.length
}

export function gridWidth(grid: GridData): number {
  return grid.length === 0 ? 0 : grid[0].length
}

export function floodfill(
  grid: GridData,
  i: number,
  j: number,
  symbol: number,
): void {
  const target = grid[i][j]
  if (target === symbol) return

  const flow = (i: number, j: number) => {
    if (i >= 0 && i < grid.length && j >= 0 && j < grid[i].length) {
      if (grid[i][j] === target) {
        grid[i][j] = symbol
        flow(i - 1, j)
        flow(i + 1, j)
        flow(i, j - 1)
        flow(i, j + 1)
      }
    }
  }
  flow(i, j)
}

export type ParseSizeResult =
  | { ok: true; height: number; width: number }
  | { ok: false; error: string; params?: Record<string, string | number> }

export function parseSize(size: string): ParseSizeResult {
  const parts = size.split('x')
  if (parts.length !== 2) {
    return { ok: false, error: 'error.size_format' }
  }
  const height = Number(parts[0])
  const width = Number(parts[1])
  if (Number.isNaN(height) || Number.isNaN(width)) {
    return { ok: false, error: 'error.size_format' }
  }
  if (height < 1 || width < 1) {
    return { ok: false, error: 'error.size_min' }
  }
  if (height > MAX_GRID_SIZE || width > MAX_GRID_SIZE) {
    return { ok: false, error: 'error.size_max', params: { max: MAX_GRID_SIZE } }
  }
  return { ok: true, height, width }
}

export function formatSize(height: number, width: number): string {
  return `${height}x${width}`
}

export function gridsEqual(a: GridData, b: GridData): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) return false
    for (let j = 0; j < a[i].length; j++) {
      if (a[i][j] !== b[i][j]) return false
    }
  }
  return true
}

export function serializeGridToGridObject(values: GridData): GridData {
  return createGrid(values.length, values[0].length, values)
}

export function computeCellSize(
  height: number,
  width: number,
  containerHeight: number,
  containerWidth: number,
  maxCellSize: number,
): number {
  const candidateHeight = Math.floor((containerHeight - height) / height)
  const candidateWidth = Math.floor((containerWidth - width) / width)
  return Math.min(candidateHeight, candidateWidth, maxCellSize)
}

export function getConnectedComponent(
  grid: GridData,
  startX: number,
  startY: number,
): Set<string> {
  const target = grid[startX]?.[startY]
  if (target === undefined) return new Set()

  const h = gridHeight(grid)
  const w = gridWidth(grid)
  const visited = new Set<string>()
  const result = new Set<string>()
  const stack: Array<[number, number]> = [[startX, startY]]

  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    if (x < 0 || x >= h || y < 0 || y >= w) continue
    const key = cellKey(x, y)
    if (visited.has(key)) continue
    visited.add(key)
    if (grid[x][y] !== target) continue
    result.add(key)
    stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1])
  }

  return result
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

export function parseCellKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(',').map(Number)
  return { x, y }
}


