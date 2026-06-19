import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SymbolPicker } from '../components/SymbolPicker'
import { SYMBOL_COUNT } from '../types'

describe('SymbolPicker', () => {
  it('renders all 10 symbol swatches', () => {
    render(<SymbolPicker selectedSymbol={0} onSelect={vi.fn()} />)
    for (let i = 0; i < SYMBOL_COUNT; i++) {
      expect(screen.getByTestId(`symbol-${i}`)).toBeInTheDocument()
    }
  })

  it('marks the selected symbol as pressed', () => {
    render(<SymbolPicker selectedSymbol={3} onSelect={vi.fn()} />)
    expect(screen.getByTestId('symbol-3')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('symbol-0')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onSelect with the symbol index on click', () => {
    const onSelect = vi.fn()
    render(<SymbolPicker selectedSymbol={0} onSelect={onSelect} />)
    fireEvent.click(screen.getByTestId('symbol-7'))
    expect(onSelect).toHaveBeenCalledWith(7)
  })
})
