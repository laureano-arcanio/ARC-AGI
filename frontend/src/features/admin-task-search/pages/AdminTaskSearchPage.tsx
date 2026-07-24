import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useTaskSearch } from '../queries'
import type { TaskSearchFilters } from '../types'

const PAGE_SIZES = [10, 20, 50, 100]
const MAX_DIM = 30
const DELTA_RANGE = 15
const DEFAULT_MIN_SOLUTIONS = '1'
const FILTER_KEYS = ['wMin', 'wMax', 'hMin', 'hMax', 'sMin', 'sMax', 'wdMin', 'wdMax', 'hdMin', 'hdMax', 'sameSize', 'allInputsSame', 'allOutputsSame'] as const
const DELTA_KEYS = new Set(['wdMin', 'wdMax', 'hdMin', 'hdMax'])

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function parseSearchParams(sp: URLSearchParams): {
  page: number
  perPage: number
  fwMin: string
  fwMax: string
  fhMin: string
  fhMax: string
  fsMin: string
  fsMax: string
  fwdMin: string
  fwdMax: string
  fhdMin: string
  fhdMax: string
} {
  return {
    page: Math.max(1, Number(sp.get('page')) || 1),
    perPage: PAGE_SIZES.includes(Number(sp.get('perPage'))) ? Number(sp.get('perPage')) : 100,
    fwMin: sp.get('wMin') ?? '0',
    fwMax: sp.get('wMax') ?? String(MAX_DIM),
    fhMin: sp.get('hMin') ?? '0',
    fhMax: sp.get('hMax') ?? String(MAX_DIM),
    fsMin: sp.get('sMin') ?? '0',
    fsMax: sp.get('sMax') ?? '',
    fwdMin: sp.get('wdMin') ?? '0',
    fwdMax: sp.get('wdMax') ?? '0',
    fhdMin: sp.get('hdMin') ?? '0',
    fhdMax: sp.get('hdMax') ?? '0',
  }
}

function filtersFromSearchParams(sp: URLSearchParams): TaskSearchFilters {
  const f: TaskSearchFilters = {}
  const sameSize = sp.get('sameSize')
  if (sp.has('wMin')) {
    const v = Number(sp.get('wMin'))
    if (v > 0) f.minWidth = String(v)
  }
  if (sp.has('wMax')) {
    const v = Number(sp.get('wMax'))
    if (v < MAX_DIM) f.maxWidth = String(v)
  }
  if (sp.has('hMin')) {
    const v = Number(sp.get('hMin'))
    if (v > 0) f.minHeight = String(v)
  }
  if (sp.has('hMax')) {
    const v = Number(sp.get('hMax'))
    if (v < MAX_DIM) f.maxHeight = String(v)
  }
  if (sp.has('sMin')) {
    const v = Number(sp.get('sMin'))
    if (v > 0) f.minSolutions = String(v)
  }
  if (sp.has('sMax')) {
    const v = Number(sp.get('sMax'))
    if (v > 0) f.maxSolutions = String(v)
  }
  if (!f.minSolutions) f.minSolutions = DEFAULT_MIN_SOLUTIONS
  if (sameSize === 'true') f.sameSize = 'true'
  else if (sameSize === 'false') f.sameSize = 'false'
  if (sp.has('wdMin')) {
    const v = Number(sp.get('wdMin'))
    if (v !== 0) f.minWidthDelta = String(v)
  }
  if (sp.has('wdMax')) {
    const v = Number(sp.get('wdMax'))
    if (v !== 0) f.maxWidthDelta = String(v)
  }
  if (sp.has('hdMin')) {
    const v = Number(sp.get('hdMin'))
    if (v !== 0) f.minHeightDelta = String(v)
  }
  if (sp.has('hdMax')) {
    const v = Number(sp.get('hdMax'))
    if (v !== 0) f.maxHeightDelta = String(v)
  }
  if (sp.has('allInputsSame')) {
    f.allInputsSame = sp.get('allInputsSame')!
  }
  if (sp.has('allOutputsSame')) {
    f.allOutputsSame = sp.get('allOutputsSame')!
  }
  return f
}

function filterParamsString(sp: URLSearchParams): string {
  return FILTER_KEYS
    .filter(k => sp.has(k))
    .map(k => `${k}=${sp.get(k)}`)
    .sort()
    .join('&')
}

function transformLabel(t: string): string {
  const labels: Record<string, string> = {
    same_size: '= dims',
    expand_both: '↗ expand',
    shrink_both: '↙ shrink',
    expand_w: '→ wider',
    shrink_w: '← narrower',
    expand_h: '↑ taller',
    shrink_h: '↓ shorter',
    expand_w_more: '→ wider+',
    shrink_w_more: '← narrower-',
    resize: '↔ resize',
  }
  return labels[t] ?? t
}

function SliderInput({ paramKey, value, min, max, onDrag, onCommit }: {
  paramKey: string
  value: string
  min: number
  max: number
  onDrag: (key: string, value: string) => void
  onCommit: (key: string, value: string) => void
}) {
  const num = isNaN(Number(value)) ? min : clamp(Number(value), min, max)

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onCommit(paramKey, String(clamp(num - 1, min, max)))}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-700 text-[11px] text-gray-400 hover:border-gray-500 hover:text-gray-200"
      >
        −
      </button>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onDrag(paramKey, e.target.value)}
        onPointerUp={() => onCommit(paramKey, value)}
        className="flex-1 accent-blue-500"
      />
      <button
        type="button"
        onClick={() => onCommit(paramKey, String(clamp(num + 1, min, max)))}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-700 text-[11px] text-gray-400 hover:border-gray-500 hover:text-gray-200"
      >
        +
      </button>
    </div>
  )
}

export function AdminTaskSearchPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const { page, perPage, fwMin, fwMax, fhMin, fhMax, fsMin, fsMax, fwdMin, fwdMax, fhdMin, fhdMax } = parseSearchParams(searchParams)

  const searchString = searchParams.toString()
  const [committedFilterStr, setCommittedFilterStr] = useState(() => filterParamsString(searchParams))

  const appliedFilters = useMemo(
    () => filtersFromSearchParams(new URLSearchParams(committedFilterStr)),
    [committedFilterStr],
  )

  const { data, isLoading, isFetching, error } = useTaskSearch(page, perPage, appliedFilters)
  const totalPages = data?.totalPages ?? 1

  const setParams = useCallback(
    (overrides: Record<string, string>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, val] of Object.entries(overrides)) {
          if (val === '') next.delete(key)
          else next.set(key, val)
        }
        return next
      }, { replace: true })
    },
    [setSearchParams],
  )

  const commitFilters = useCallback((overrides: Record<string, string>) => {
    const sp = new URLSearchParams(searchString)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === '') sp.delete(k)
      else sp.set(k, v)
    }
    setCommittedFilterStr(filterParamsString(sp))
  }, [searchString])

  function stripZeroDelta(overrides: Record<string, string>): Record<string, string> {
    const clean = { ...overrides }
    for (const k of Object.keys(clean)) {
      if (DELTA_KEYS.has(k) && clean[k] === '0') clean[k] = ''
    }
    return clean
  }

  const applyAndCommit = useCallback((overrides: Record<string, string>) => {
    setParams(overrides)
    commitFilters(overrides)
  }, [setParams, commitFilters])

  const handleDrag = useCallback((key: string, value: string) => {
    setParams(stripZeroDelta({ [key]: value, page: '1' }))
  }, [setParams])

  const handleCommit = useCallback((key: string, value: string) => {
    applyAndCommit(stripZeroDelta({ [key]: value, page: '1' }))
  }, [applyAndCommit])

  const handleClear = () => {
    setCommittedFilterStr('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const toggleFilter = useCallback((key: string, valueOn: string) => {
    applyAndCommit({ [key]: searchParams.get(key) === valueOn ? '' : valueOn, page: '1' })
  }, [applyAndCommit, searchParams])

  const sameSize = searchParams.get('sameSize')
  const allInputsSame = searchParams.get('allInputsSame')
  const allOutputsSame = searchParams.get('allOutputsSame')

  if (authLoading || (!data && isLoading)) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
        {t('task_search.loading')}
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">{t('task_search.unauthorized')}</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">{t('task_search.error')}</p>
        <p className="mt-1 text-sm">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">{t('task_search.title')}</h1>

      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('task_search.filter_width')}</label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{t('task_search.min')}</span>
              <SliderInput paramKey="wMin" value={fwMin} min={0} max={MAX_DIM} onDrag={handleDrag} onCommit={handleCommit} />
              <span className="w-6 text-center text-xs text-gray-300">{fwMin}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{t('task_search.max')}</span>
              <SliderInput paramKey="wMax" value={fwMax} min={0} max={MAX_DIM} onDrag={handleDrag} onCommit={handleCommit} />
              <span className="w-6 text-center text-xs text-gray-300">{fwMax}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('task_search.filter_height')}</label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{t('task_search.min')}</span>
              <SliderInput paramKey="hMin" value={fhMin} min={0} max={MAX_DIM} onDrag={handleDrag} onCommit={handleCommit} />
              <span className="w-6 text-center text-xs text-gray-300">{fhMin}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{t('task_search.max')}</span>
              <SliderInput paramKey="hMax" value={fhMax} min={0} max={MAX_DIM} onDrag={handleDrag} onCommit={handleCommit} />
              <span className="w-6 text-center text-xs text-gray-300">{fhMax}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('task_search.filter_solutions')}</label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{t('task_search.min')}</span>
              <SliderInput paramKey="sMin" value={fsMin} min={0} max={20} onDrag={handleDrag} onCommit={handleCommit} />
              <span className="w-6 text-center text-xs text-gray-300">{fsMin}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{t('task_search.max')}</span>
              <SliderInput paramKey="sMax" value={fsMax} min={0} max={20} onDrag={handleDrag} onCommit={handleCommit} />
              <span className="w-6 text-center text-xs text-gray-300">{fsMax}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('task_search.filter_width_delta')}</label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{t('task_search.min')}</span>
              <SliderInput paramKey="wdMin" value={fwdMin} min={-DELTA_RANGE} max={DELTA_RANGE} onDrag={handleDrag} onCommit={handleCommit} />
              <span className="w-6 text-center text-xs text-gray-300">{fwdMin}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{t('task_search.max')}</span>
              <SliderInput paramKey="wdMax" value={fwdMax} min={-DELTA_RANGE} max={DELTA_RANGE} onDrag={handleDrag} onCommit={handleCommit} />
              <span className="w-6 text-center text-xs text-gray-300">{fwdMax}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('task_search.filter_height_delta')}</label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{t('task_search.min')}</span>
              <SliderInput paramKey="hdMin" value={fhdMin} min={-DELTA_RANGE} max={DELTA_RANGE} onDrag={handleDrag} onCommit={handleCommit} />
              <span className="w-6 text-center text-xs text-gray-300">{fhdMin}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{t('task_search.max')}</span>
              <SliderInput paramKey="hdMax" value={fhdMax} min={-DELTA_RANGE} max={DELTA_RANGE} onDrag={handleDrag} onCommit={handleCommit} />
              <span className="w-6 text-center text-xs text-gray-300">{fhdMax}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => toggleFilter('allInputsSame', 'true')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              allInputsSame === 'true'
                ? 'bg-purple-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.inputs_same')}
          </button>
          <button
            onClick={() => toggleFilter('allInputsSame', 'false')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              allInputsSame === 'false'
                ? 'bg-purple-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.inputs_vary')}
          </button>
          <button
            onClick={() => toggleFilter('allOutputsSame', 'true')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              allOutputsSame === 'true'
                ? 'bg-purple-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.outputs_same')}
          </button>
          <button
            onClick={() => toggleFilter('allOutputsSame', 'false')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              allOutputsSame === 'false'
                ? 'bg-purple-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.outputs_vary')}
          </button>
          <button
            onClick={() => toggleFilter('sameSize', 'false')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              sameSize === 'false'
                ? 'bg-purple-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.input_diff_output')}
          </button>
          <button
            onClick={() => toggleFilter('sameSize', 'true')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              sameSize === 'true'
                ? 'bg-purple-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.input_eq_output')}
          </button>
          <button
            onClick={handleClear}
            className="rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition hover:border-gray-500 hover:text-gray-300"
          >
            {t('task_search.clear_filters')}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{t('task_search.showing')}</span>
          <span className="text-gray-200">{(page - 1) * perPage + 1}</span>
          <span>-</span>
          <span className="text-gray-200">{Math.min(page * perPage, data?.total ?? 0)}</span>
          <span>{t('task_search.of')}</span>
          <span className="text-gray-200">{data?.total ?? 0}</span>
          {isFetching && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{t('task_search.per_page')}</span>
          <select
            value={perPage}
            onChange={(e) => applyAndCommit({ perPage: e.target.value, page: '1' })}
            className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t('task_search.table.task_id')}</th>
              <th className="px-4 py-3 font-medium">{t('task_search.table.has_solution')}</th>
              <th className="px-4 py-3 font-medium">{t('task_search.table.solver_emails')}</th>
              <th className="px-4 py-3 font-medium">{t('task_search.table.solution_count')}</th>
              <th className="px-4 py-3 font-medium">{t('task_search.table.transform')}</th>
              <th className="px-4 py-3 font-medium">{t('task_search.table.width')}</th>
              <th className="px-4 py-3 font-medium">{t('task_search.table.height')}</th>
              <th className="px-4 py-3 font-medium">{t('task_search.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data?.items.map((task) => (
              <tr key={task.taskId} className="transition hover:bg-gray-900/50">
                <td className="px-4 py-3 font-mono text-xs text-blue-400">
                  {task.taskId}
                </td>
                <td className="px-4 py-3">
                  {task.hasSolution ? (
                    <span className="rounded bg-green-600/20 px-2 py-0.5 text-xs text-green-400">
                      {t('task_search.yes')}
                    </span>
                  ) : (
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
                      {t('task_search.no')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {task.solvers.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {task.solvers.map((s) => (
                        <Link
                          key={s.userId}
                          to={`/admin/users/${s.userId}/task/${task.taskId}`}
                          className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          {s.email}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-300">{task.solutionCount}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    task.sameSize ? 'bg-gray-800 text-gray-400' : 'bg-blue-900/30 text-blue-300'
                  }`}>
                    {transformLabel(task.transformLabel)}
                  </span>
                  {!task.sameSize && task.widthDelta !== null && task.heightDelta !== null && (
                    <span className="ml-1 text-[10px] text-gray-500">
                      ({task.widthDelta > 0 ? '+' : ''}{task.widthDelta}
                      ,{task.heightDelta > 0 ? '+' : ''}{task.heightDelta})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-300">{task.width}</td>
                <td className="px-4 py-3 text-gray-300">{task.height}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/admin/tasks/${task.taskId}/solutions`}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    {t('task_search.view_solutions')}
                  </Link>
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  {t('task_search.no_results')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => applyAndCommit({ page: String(Math.max(1, page - 1)) })}
            disabled={page <= 1}
            className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-400 transition hover:border-gray-500 hover:text-gray-200 disabled:opacity-40"
          >
            {t('task_search.prev')}
          </button>
          {renderPageNumbers(page, totalPages, (p) => applyAndCommit({ page: String(p) }))}
          <button
            onClick={() => applyAndCommit({ page: String(Math.min(totalPages, page + 1)) })}
            disabled={page >= totalPages}
            className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-400 transition hover:border-gray-500 hover:text-gray-200 disabled:opacity-40"
          >
            {t('task_search.next')}
          </button>
        </div>
      )}
    </div>
  )
}

function renderPageNumbers(
  current: number,
  total: number,
  setPage: (p: number) => void,
) {
  const pages: (number | '...')[] = []
  const delta = 2
  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - delta && i <= current + delta)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }
  return pages.map((p, i) =>
    p === '...' ? (
      <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-600">...</span>
    ) : (
      <button
        key={p}
        onClick={() => setPage(p)}
        className={`rounded px-2 py-1 text-xs transition ${
          p === current
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        {p}
      </button>
    ),
  )
}
