import { useEffect, useState } from 'react'
import { X, Plus, Link2, Trash2, Tag } from 'lucide-react'
import type { TaskTag, TaskTagRelation } from '../types'
import { MaskPreview } from './MaskPreview'

type TagPanelProps = {
  tags: TaskTag[]
  relations: TaskTagRelation[]
  selectedTagIds: Set<number>
  onCreateTaskTag: (label: string) => void
  onCreateSelectionTag: (label: string) => void
  onCreateGridTag: (label: string, pairType: 'train' | 'test', pairIndex: number, gridType: 'input' | 'output') => void
  onDeleteTag: (tagId: number) => void
  onToggleTagSelection: (tagId: number) => void
  onCreateRelation: (fromTagId: number, toTagId: number, label: string) => void
  onDeleteRelation: (relationId: number) => void
  hasActiveSelection: boolean
  activeGridContext: { pairType: 'train' | 'test'; pairIndex: number; gridType: 'input' | 'output' } | null
}

const scopeColors: Record<string, string> = {
  task: 'bg-purple-900/50 text-purple-300 border-purple-700',
  grid: 'bg-blue-900/50 text-blue-300 border-blue-700',
  selection: 'bg-green-900/50 text-green-300 border-green-700',
}

export function TagPanel({
  tags,
  relations,
  selectedTagIds,
  onCreateTaskTag,
  onCreateSelectionTag,
  onCreateGridTag,
  onDeleteTag,
  onToggleTagSelection,
  onCreateRelation,
  onDeleteRelation,
  hasActiveSelection,
  activeGridContext,
}: TagPanelProps) {
  const [newLabel, setNewLabel] = useState('')
  const [relationLabel, setRelationLabel] = useState('')
  const [showRelationInput, setShowRelationInput] = useState(false)
  const [selectedScope, setSelectedScope] = useState<'task' | 'grid' | 'selection'>('task')

  useEffect(() => {
    if (hasActiveSelection && selectedScope !== 'selection') {
      setSelectedScope('selection')
    }
  }, [hasActiveSelection])

  const taskTags = tags.filter((t) => t.scopeType === 'task')
  const gridTags = tags.filter((t) => t.scopeType === 'grid')
  const selectionTags = tags.filter((t) => t.scopeType === 'selection')

  const selectedSelectionTags = selectionTags.filter((t) => selectedTagIds.has(t.id))
  const canCreateRelation = selectedSelectionTags.length >= 2

  const handleAddLabel = () => {
    const label = newLabel.trim()
    if (!label) return

    if (selectedScope === 'selection' && hasActiveSelection) {
      onCreateSelectionTag(label)
    } else if (selectedScope === 'grid' && activeGridContext) {
      onCreateGridTag(label, activeGridContext.pairType, activeGridContext.pairIndex, activeGridContext.gridType)
    } else {
      onCreateTaskTag(label)
    }
    setNewLabel('')
  }

  const handleCreateRelation = () => {
    const label = relationLabel.trim()
    if (!label || !canCreateRelation) return
    const [first, ...rest] = selectedSelectionTags
    for (const tag of rest) {
      onCreateRelation(first.id, tag.id, label)
    }
    setRelationLabel('')
    setShowRelationInput(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddLabel()
    }
  }

  return (
    <div className="sticky top-0 flex h-screen w-72 flex-col gap-3 overflow-y-auto border-l border-gray-800 bg-gray-950 p-3">
      <div className="flex items-center gap-2">
        <Tag size={14} className="text-gray-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tags</h3>
      </div>

      <div className="flex gap-1">
        {(['task', 'grid', 'selection'] as const).map((scope) => {
          const disabled = scope === 'selection' ? !hasActiveSelection : scope === 'grid' ? !activeGridContext : false
          return (
            <button
              key={scope}
              disabled={disabled}
              onClick={() => setSelectedScope(scope)}
              className={`flex-1 rounded px-1.5 py-1 text-[10px] font-semibold uppercase transition ${
                selectedScope === scope
                  ? 'border bg-opacity-100 text-white ' + (scope === 'task' ? 'bg-purple-700 border-purple-500' : scope === 'grid' ? 'bg-blue-700 border-blue-500' : 'bg-green-700 border-green-500')
                  : 'border border-gray-700 bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
              } disabled:opacity-20 disabled:cursor-not-allowed`}
            >
              {scope === 'task' ? 'Task' : scope === 'grid' ? 'Grid' : 'Sel'}
            </button>
          )
        })}
      </div>

      <div className="flex gap-1">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedScope === 'selection'
              ? 'Tag selection...'
              : selectedScope === 'grid'
                ? 'Tag grid...'
                : 'Tag task...'
          }
          className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={handleAddLabel}
          disabled={!newLabel.trim()}
          className="rounded bg-blue-600 px-2 py-1.5 text-xs text-white transition hover:bg-blue-500 disabled:opacity-30"
        >
          <Plus size={14} />
        </button>
      </div>

      <p className="text-[10px] text-gray-600">
        {selectedScope === 'task'
          ? 'Adding to task (global)'
          : selectedScope === 'grid' && activeGridContext
            ? `Adding to ${activeGridContext.pairType} ${activeGridContext.pairIndex + 1} ${activeGridContext.gridType}`
            : selectedScope === 'selection' && hasActiveSelection
              ? 'Adding to selection'
              : ''}
      </p>

      {taskTags.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-purple-400">
            Task Tags
          </p>
          <div className="flex flex-col gap-1">
            {taskTags.map((tag) => (
              <TagItem
                key={tag.id}
                tag={tag}
                index={tags.indexOf(tag)}
                selected={selectedTagIds.has(tag.id)}
                onToggle={() => onToggleTagSelection(tag.id)}
                onDelete={() => onDeleteTag(tag.id)}
              />
            ))}
          </div>
        </div>
      )}

      {gridTags.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
            Grid Tags
          </p>
          <div className="flex flex-col gap-1">
            {gridTags.map((tag) => (
              <TagItem
                key={tag.id}
                tag={tag}
                index={tags.indexOf(tag)}
                selected={selectedTagIds.has(tag.id)}
                onToggle={() => onToggleTagSelection(tag.id)}
                onDelete={() => onDeleteTag(tag.id)}
              />
            ))}
          </div>
        </div>
      )}

      {selectionTags.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-green-400">
            Selection Tags
          </p>
          <div className="flex flex-col gap-1">
            {selectionTags.map((tag) => (
              <TagItem
                key={tag.id}
                tag={tag}
                index={tags.indexOf(tag)}
                selected={selectedTagIds.has(tag.id)}
                onToggle={() => onToggleTagSelection(tag.id)}
                onDelete={() => onDeleteTag(tag.id)}
              />
            ))}
          </div>
        </div>
      )}

      {selectionTags.length > 0 && (
        <div className="border-t border-gray-800 pt-2">
          <div className="flex items-center gap-2">
            <Link2 size={12} className="text-gray-500" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Relations
            </p>
          </div>

          {canCreateRelation && (
            <div className="mt-1">
              {showRelationInput ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={relationLabel}
                    onChange={(e) => setRelationLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateRelation()
                      if (e.key === 'Escape') setShowRelationInput(false)
                    }}
                    placeholder="Relation label..."
                    className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-[10px] text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateRelation}
                    disabled={!relationLabel.trim()}
                    className="rounded bg-green-700 px-1.5 py-1 text-[10px] text-white hover:bg-green-600 disabled:opacity-30"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRelationInput(true)}
                  className="mt-1 w-full rounded border border-dashed border-gray-700 px-2 py-1 text-[10px] text-gray-500 transition hover:border-gray-500 hover:text-gray-300"
                >
                  Link selected ({selectedSelectionTags.map((t) => `#${tags.indexOf(t) + 1}`).join(', ')})
                </button>
              )}
            </div>
          )}

          {relations.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {relations.map((rel) => {
                const fromIdx = tags.findIndex((t) => t.id === rel.fromTagId) + 1
                const toIdx = tags.findIndex((t) => t.id === rel.toTagId) + 1
                return (
                  <div
                    key={rel.id}
                    className="flex items-center gap-1 rounded border border-gray-800 bg-gray-900/50 px-2 py-1"
                  >
                    <span className="text-[10px] font-mono text-gray-400">
                      #{fromIdx} &rarr; #{toIdx}
                    </span>
                    <span className="flex-1 truncate text-[10px] text-gray-300">
                      {rel.labels.join(', ')}
                    </span>
                    <button
                      onClick={() => onDeleteRelation(rel.id)}
                      className="text-gray-600 transition hover:text-red-400"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tags.length === 0 && (
        <p className="mt-4 text-center text-[10px] text-gray-600">
          No tags yet. Select cells or click to add task-level tags.
        </p>
      )}
    </div>
  )
}

function TagItem({
  tag,
  index,
  selected,
  onToggle,
  onDelete,
}: {
  tag: TaskTag
  index: number
  selected: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`flex items-start gap-1.5 rounded border px-2 py-1.5 transition cursor-pointer ${
        selected
          ? 'border-blue-500 bg-blue-950/30'
          : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
      }`}
      onClick={onToggle}
    >
      <span
        className={`mt-0.5 shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase ${
          scopeColors[tag.scopeType] ?? ''
        }`}
      >
        #{index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap gap-1">
          {tag.labels.map((label, i) => (
            <span key={i} className="rounded bg-gray-800 px-1 py-0.5 text-[10px] text-gray-300">
              {label}
            </span>
          ))}
        </div>
        {tag.scopeType !== 'task' && (
          <span className="text-[9px] text-gray-600">
            {tag.pairType} {tag.pairIndex !== null ? (tag.pairIndex + 1) : ''} {tag.gridType ?? ''}
          </span>
        )}
        {tag.mask && (
          <div className="mt-0.5">
            <MaskPreview mask={tag.mask} size={6} />
          </div>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="shrink-0 text-gray-600 transition hover:text-red-400"
      >
        <Trash2 size={10} />
      </button>
    </div>
  )
}
