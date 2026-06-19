import { COLOR_MAP, SYMBOL_COUNT } from '../types'

type SymbolPickerProps = {
  selectedSymbol: number
  onSelect: (symbol: number) => void
}

export function SymbolPicker({ selectedSymbol, onSelect }: SymbolPickerProps) {
  const symbols = Array.from({ length: SYMBOL_COUNT }, (_, i) => i)

  return (
    <div data-testid="symbol-picker" className="flex flex-wrap gap-1.5">
      {symbols.map((symbol) => (
        <button
          key={symbol}
          type="button"
          data-testid={`symbol-${symbol}`}
          data-symbol={symbol}
          onClick={() => onSelect(symbol)}
          aria-label={`Symbol ${symbol}`}
          aria-pressed={selectedSymbol === symbol}
          className={`h-7 w-7 rounded-md transition ${
            selectedSymbol === symbol
              ? 'ring-2 ring-orange-500 ring-offset-1 ring-offset-gray-900'
              : 'ring-1 ring-gray-700 hover:ring-gray-500'
          }`}
          style={{ backgroundColor: COLOR_MAP[symbol] }}
        />
      ))}
    </div>
  )
}
