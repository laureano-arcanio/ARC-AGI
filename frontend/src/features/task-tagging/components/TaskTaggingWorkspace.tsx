import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Combine, Droplets, LassoSelect, MousePointer2, SquareDashed, Tag } from 'lucide-react'
import { TaggableGrid } from './TaggableGrid'
import { TagPanel } from './TagPanel'
import { RelationOverlay, getTagColor } from './RelationOverlay'
import { cellKey } from '../../arc-lab/utils'
import {
  useTaskTags,
  useTaskTagRelations,
  useCreateTaskTag,
  useDeleteTaskTag,
  useCreateTaskTagRelation,
  useDeleteTaskTagRelation,
} from '../queries'
import type { GridSelection, TagMode, TaskTag } from '../types'
import type { TaskPair } from '../../arc-lab/types'

type TaskTaggingWorkspaceProps = {
  taskId: string
  train: TaskPair[]
  test: TaskPair[]
}

function buildMask(
  grid: number[][],
  selectedCells: Set<string>,
): (number | '#')[][] {
  return grid.map((row, i) =>
    row.map((cell, j) => (selectedCells.has(cellKey(i, j)) ? cell : '#')),
  )
}

export function TaskTaggingWorkspace({ taskId, train, test }: TaskTaggingWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tagMode, setTagMode] = useState<TagMode>('select')
  const [selection, setSelection] = useState<GridSelection | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set())

  const { data: tags = [] } = useTaskTags(taskId)
  const { data: relations = [] } = useTaskTagRelations(taskId)
  const createTag = useCreateTaskTag()
  const deleteTag = useDeleteTaskTag()
  const createRelation = useCreateTaskTagRelation()
  const deleteRelation = useDeleteTaskTagRelation()

  const taggedCellsByGrid = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const tag of tags) {
      if (tag.scopeType !== 'selection' || !tag.selectedCells) continue
      const key = `${tag.pairType}-${tag.pairIndex}-${tag.gridType}`
      const existing = map.get(key) ?? new Set<string>()
      for (const cell of tag.selectedCells) {
        existing.add(cell)
      }
      map.set(key, existing)
    }
    return map
  }, [tags])

  const handleGridClick = useCallback(
    (pairType: 'train' | 'test', pairIndex: number, gridType: 'input' | 'output', cells: Set<string>) => {
      if (
        selection &&
        selection.pairType === pairType &&
        selection.pairIndex === pairIndex &&
        selection.gridType === gridType
      ) {
        setSelection({ ...selection, cells })
      } else {
        setSelection({ pairType, pairIndex, gridType, cells })
      }
    },
    [selection],
  )

  const handleCreateTaskTag = useCallback(
    (label: string) => {
      createTag.mutate({ taskId, scopeType: 'task', labels: [label] })
    },
    [taskId, createTag],
  )

  const handleCreateSelectionTag = useCallback(
    (label: string) => {
      if (!selection || selection.cells.size === 0) return
      const grid = getGrid(train, test, selection.pairType, selection.pairIndex, selection.gridType)
      if (!grid) return
      const mask = buildMask(grid, selection.cells)
      createTag.mutate({
        taskId,
        scopeType: 'selection',
        pairType: selection.pairType,
        pairIndex: selection.pairIndex,
        gridType: selection.gridType,
        selectedCells: Array.from(selection.cells),
        mask,
        labels: [label],
      })
    },
    [selection, train, test, taskId, createTag],
  )

  const handleCreateGridTag = useCallback(
    (label: string, pairType: 'train' | 'test', pairIndex: number, gridType: 'input' | 'output') => {
      createTag.mutate({
        taskId,
        scopeType: 'grid',
        pairType,
        pairIndex,
        gridType,
        labels: [label],
      })
    },
    [taskId, createTag],
  )

  const handleDeleteTag = useCallback(
    (tagId: number) => {
      deleteTag.mutate({ tagId, taskId })
    },
    [taskId, deleteTag],
  )

  const handleToggleTagSelection = useCallback(
    (tagId: number) => {
      setSelectedTagIds((prev) => {
        const next = new Set(prev)
        if (next.has(tagId)) {
          next.delete(tagId)
        } else {
          next.add(tagId)
        }
        return next
      })
    },
    [],
  )

  const handleCreateRelation = useCallback(
    (fromTagId: number, toTagId: number, label: string) => {
      createRelation.mutate({ taskId, fromTagId, toTagId, labels: [label] })
      setSelectedTagIds(new Set())
    },
    [taskId, createRelation],
  )

  const handleDeleteRelation = useCallback(
    (relationId: number) => {
      deleteRelation.mutate({ relationId, taskId })
    },
    [taskId, deleteRelation],
  )

  const activeGridContext = selection
    ? { pairType: selection.pairType, pairIndex: selection.pairIndex, gridType: selection.gridType }
    : null

  const hasActiveSelection = selection !== null && selection.cells.size > 0

  const modeButtons: { mode: TagMode; icon: typeof MousePointer2; label: string }[] = [
    { mode: 'select', icon: MousePointer2, label: 'Select' },
    { mode: 'object_select', icon: LassoSelect, label: 'Object' },
    { mode: 'area_select', icon: SquareDashed, label: 'Area' },
    { mode: 'color_select', icon: Droplets, label: 'Color' },
    { mode: 'floodfill_select', icon: Combine, label: 'Floodfill' },
  ]

  const containerWidthRef = useRef(0)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      containerWidthRef.current = w
      setContainerWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function computeCellSize(maxCols: number): number {
    const overhead = 98
    const perGrid = Math.max(50, (containerWidth - overhead) / 2)
    return Math.max(8, Math.min(40, Math.floor(perGrid / maxCols)))
  }

  return (
    <div className="flex">
      <div ref={containerRef} className="relative min-w-0 flex-1 p-4">
        <div className="sticky top-0 z-10 mb-4 flex items-center gap-2 bg-gray-950 pb-2">
          <Tag size={14} className="text-gray-500" />
          <span className="text-xs font-semibold text-gray-400">Mode:</span>
          {modeButtons.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setTagMode(mode)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                tagMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
          {hasActiveSelection && (
            <span className="ml-2 text-[10px] text-gray-500">
              {selection!.cells.size} cells selected
            </span>
          )}
        </div>

        <RelationOverlay tags={tags} relations={relations} containerRef={containerRef} />

        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Train ({train.length} pairs)
            </h3>
            <div className="flex flex-col gap-4">
              {train.map((pair, i) => {
                const maxCols = Math.max(
                  pair.input[0]?.length ?? 0,
                  pair.output[0]?.length ?? 0,
                )
                return (
                  <PairCard
                    key={i}
                    pair={pair}
                    index={i}
                    type="train"
                    tagMode={tagMode}
                    selection={selection}
                    tags={tags}
                    taggedCellsByGrid={taggedCellsByGrid}
                    onGridClick={handleGridClick}
                    cellSize={computeCellSize(maxCols)}
                  />
                )
              })}
            </div>
          </div>

          {test.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Test ({test.length} pairs)
              </h3>
              <div className="flex flex-col gap-4">
              {test.map((pair, i) => {
                const maxCols = Math.max(
                  pair.input[0]?.length ?? 0,
                  pair.output[0]?.length ?? 0,
                )
                return (
                  <PairCard
                    key={i}
                    pair={pair}
                    index={i}
                    type="test"
                    tagMode={tagMode}
                    selection={selection}
                    tags={tags}
                    taggedCellsByGrid={taggedCellsByGrid}
                    onGridClick={handleGridClick}
                    cellSize={computeCellSize(maxCols)}
                  />
                )
              })}
              </div>
            </div>
          )}
        </div>
      </div>

      <TagPanel
        tags={tags}
        relations={relations}
        selectedTagIds={selectedTagIds}
        onCreateTaskTag={handleCreateTaskTag}
        onCreateSelectionTag={handleCreateSelectionTag}
        onCreateGridTag={handleCreateGridTag}
        onDeleteTag={handleDeleteTag}
        onToggleTagSelection={handleToggleTagSelection}
        onCreateRelation={handleCreateRelation}
        onDeleteRelation={handleDeleteRelation}
        hasActiveSelection={hasActiveSelection}
        activeGridContext={activeGridContext}
      />
    </div>
  )
}

function PairCard({
  pair,
  index,
  type,
  tagMode,
  selection,
  tags,
  taggedCellsByGrid,
  onGridClick,
  cellSize,
}: {
  pair: TaskPair
  index: number
  type: 'train' | 'test'
  tagMode: TagMode
  selection: GridSelection | null
  tags: TaskTag[]
  taggedCellsByGrid: Map<string, Set<string>>
  onGridClick: (pairType: 'train' | 'test', pairIndex: number, gridType: 'input' | 'output', cells: Set<string>) => void
  cellSize: number
}) {
  const inputKey = `${type}-${index}-input`
  const outputKey = `${type}-${index}-output`

  const isInputActive =
    selection?.pairType === type && selection?.pairIndex === index && selection?.gridType === 'input'
  const isOutputActive =
    selection?.pairType === type && selection?.pairIndex === index && selection?.gridType === 'output'

  const inputTaggedCells = taggedCellsByGrid.get(inputKey) ?? new Set()
  const outputTaggedCells = taggedCellsByGrid.get(outputKey) ?? new Set()

  const gridTags = tags.filter(
    (t) => t.scopeType === 'grid' && t.pairType === type && t.pairIndex === index,
  )

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
      <p className="mb-3 text-xs font-semibold text-gray-400">
        {type === 'train' ? 'Train' : 'Test'} {index + 1}
      </p>
      <div className="flex flex-row items-center gap-2">
        <div className={`rounded p-1 transition ${isInputActive ? 'ring-1 ring-blue-500' : ''}`}>
          <p className="mb-1 text-center text-[10px] text-gray-500">Input</p>
          <p className="mb-1 text-center text-[9px] text-gray-600">{pair.input.length}×{pair.input[0]?.length ?? 0}</p>
          <TaggableGrid
            grid={pair.input}
            tagMode={tagMode}
            selectedCells={isInputActive ? selection!.cells : new Set()}
            taggedCellKeys={inputTaggedCells}
            cellSize={cellSize}
            onSelectionChange={(cells) => onGridClick(type, index, 'input', cells)}
          />
        </div>
        {pair.output.length > 0 && (
          <>
            <ChevronRight size={16} className="text-gray-600 shrink-0" />
            <div className={`rounded p-1 transition ${isOutputActive ? 'ring-1 ring-blue-500' : ''}`}>
              <p className="mb-1 text-center text-[10px] text-gray-500">Output</p>
              <p className="mb-1 text-center text-[9px] text-gray-600">{pair.output.length}×{pair.output[0]?.length ?? 0}</p>
              <TaggableGrid
                grid={pair.output}
                tagMode={tagMode}
                selectedCells={isOutputActive ? selection!.cells : new Set()}
                taggedCellKeys={outputTaggedCells}
                cellSize={cellSize}
                onSelectionChange={(cells) => onGridClick(type, index, 'output', cells)}
              />
            </div>
          </>
        )}
      </div>
        {gridTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {gridTags.map((tag) => (
              <span
                key={tag.id}
                className="rounded px-1 py-0.5 text-[9px]"
                style={{
                  backgroundColor: `${getTagColor(tags.indexOf(tag))}20`,
                  color: getTagColor(tags.indexOf(tag)),
                }}
              >
                #{tags.indexOf(tag) + 1} {tag.labels[0]}
              </span>
            ))}
          </div>
        )}
    </div>
  )
}

function getGrid(
  train: TaskPair[],
  test: TaskPair[],
  pairType: 'train' | 'test',
  pairIndex: number,
  gridType: 'input' | 'output',
): number[][] | null {
  const pairs = pairType === 'train' ? train : test
  const pair = pairs[pairIndex]
  if (!pair) return null
  return gridType === 'input' ? pair.input : pair.output
}
