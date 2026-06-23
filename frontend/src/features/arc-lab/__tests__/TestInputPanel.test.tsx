import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestInputPanel } from '../components/TestInputPanel'

describe('TestInputPanel', () => {
  it('renders the input grid cells', () => {
    render(
      <TestInputPanel input={[[1, 2], [3, 4]]} />,
    )
    expect(screen.getByTestId('0,0')).toBeInTheDocument()
    expect(screen.getByTestId('1,1')).toBeInTheDocument()
  })

  it('shows symbol numbers when showNumbers is true', () => {
    render(
      <TestInputPanel input={[[7]]} showNumbers />,
    )
    expect(screen.getByTestId('0,0').textContent).toBe('7')
  })

})
