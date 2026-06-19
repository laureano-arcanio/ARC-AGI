import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToolBar } from '../components/ToolBar'
import type { ToolMode } from '../types'

describe('ToolBar', () => {
  it('renders three tool buttons', () => {
    render(<ToolBar toolMode="edit" onChange={vi.fn()} />)
    expect(screen.getByTestId('tool-edit')).toBeInTheDocument()
    expect(screen.getByTestId('tool-select')).toBeInTheDocument()
    expect(screen.getByTestId('tool-floodfill')).toBeInTheDocument()
  })

  it('marks the active tool with aria-pressed', () => {
    render(<ToolBar toolMode="select" onChange={vi.fn()} />)
    expect(screen.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('tool-edit')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with the new mode', () => {
    const onChange = vi.fn()
    render(<ToolBar toolMode="edit" onChange={onChange} />)
    fireEvent.click(screen.getByTestId('tool-floodfill'))
    expect(onChange).toHaveBeenCalledWith('floodfill')
  })

  it('covers all tool modes', () => {
    const modes: ToolMode[] = ['edit', 'select', 'floodfill']
    for (const mode of modes) {
      const { unmount } = render(<ToolBar toolMode={mode} onChange={vi.fn()} />)
      expect(screen.getByTestId(`tool-${mode}`)).toHaveAttribute('aria-pressed', 'true')
      unmount()
    }
  })
})
