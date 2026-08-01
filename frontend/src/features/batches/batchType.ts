export const BATCH_TYPE_STYLES: Record<
  string,
  { badge: string; border: string; label: string }
> = {
  solver: {
    badge: 'bg-blue-900/40 text-blue-400 border-blue-800',
    border: 'border-l-blue-500',
    label: 'Solver',
  },
  review: {
    badge: 'bg-purple-900/40 text-purple-400 border-purple-800',
    border: 'border-l-purple-500',
    label: 'Review',
  },
}

export function batchTypeStyle(type: string): {
  badge: string
  border: string
  label: string
} {
  return BATCH_TYPE_STYLES[type] ?? BATCH_TYPE_STYLES.solver
}
