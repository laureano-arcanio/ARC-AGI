import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export type MultiselectOption = {
  value: number
  label: string
}

type MultiselectProps = {
  options: MultiselectOption[]
  selectedValues: number[]
  onToggle: (value: number) => void
  placeholder?: string
  disabled?: boolean
}

export function Multiselect({ options, selectedValues, onToggle, placeholder, disabled }: MultiselectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setSearch('')
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, close])

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 256),
      })
    }
    setOpen(!open)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="flex w-full items-center gap-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-300 hover:border-gray-600 disabled:opacity-50"
      >
        {selectedValues.length === 0
          ? (placeholder || 'Select...')
          : `${selectedValues.length} selected`}
        <span className="ml-auto">{open ? '▴' : '▾'}</span>
      </button>
      {open && position && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
          className="z-50 max-h-60 overflow-auto rounded border border-gray-700 bg-gray-900 shadow-lg"
        >
          {options.length > 8 && (
            <div className="sticky top-0 border-b border-gray-700 bg-gray-900 p-1">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full rounded bg-gray-800 px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
          )}
          {filtered.map(option => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={() => onToggle(option.value)}
                className="h-3 w-3 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-0"
              />
              {option.label}
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-500">No options</p>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
