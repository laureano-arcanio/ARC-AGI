import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DemonstrationPanel } from '../components/DemonstrationPanel'
import type { TaskPair } from '../types'

const pairs: TaskPair[] = [
  { input: [[1, 2]], output: [[3, 4]] },
  { input: [[5, 6]], output: [[7, 8]] },
]

describe('DemonstrationPanel', () => {
  it('renders a header', () => {
    render(<DemonstrationPanel pairs={pairs} />)
    expect(screen.getByText('panel.demonstration')).toBeInTheDocument()
  })

  it('renders one pair preview per training pair', () => {
    render(<DemonstrationPanel pairs={pairs} />)
    expect(screen.getByTestId('pair-0')).toBeInTheDocument()
    expect(screen.getByTestId('pair-1')).toBeInTheDocument()
  })

  it('renders input and output grids for each pair', () => {
    render(<DemonstrationPanel pairs={pairs} />)
    expect(screen.getByTestId('pair-0-input')).toBeInTheDocument()
    expect(screen.getByTestId('pair-0-output')).toBeInTheDocument()
    expect(screen.getByTestId('pair-1-input')).toBeInTheDocument()
    expect(screen.getByTestId('pair-1-output')).toBeInTheDocument()
  })

  it('shows a placeholder when no pairs', () => {
    render(<DemonstrationPanel pairs={[]} />)
    expect(screen.getByText('panel.empty')).toBeInTheDocument()
  })
})
