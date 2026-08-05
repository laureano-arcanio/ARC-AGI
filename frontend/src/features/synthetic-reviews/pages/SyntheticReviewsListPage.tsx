import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useReviewGroups, useSyntheticModels, useUsers } from '../queries'
import type { ReviewGroupsFilters } from '../types'

const PAGE_SIZES = [10, 20, 50, 100]
const MAX_DIM = 30
const DELTA_RANGE = 15
const DEFAULT_MIN_SOLUTIONS = '1'

const FILTER_KEYS = [
  'wMin', 'wMax', 'hMin', 'hMax', 'sMin', 'sMax',
  'wdMin', 'wdMax', 'hdMin', 'hdMax',
  'sameSize', 'allInputsSame', 'allOutputsSame', 'hasTags',
  'solverEmail', 'hypothesisText', 'taskId', 'dataset',
  'modelName', 'concept', 'witnessPassed',
  'userReviewStatus', 'reviewerEmail', 'minIncorrectMarks',
  'adminReviewStatus', 'adminCorrect', 'adminVerified',
  'onlyMultipleVariants', 'originalTaskId',
] as const
const DELTA_KEYS = new Set(['wdMin', 'wdMax', 'hdMin', 'hdMax'])
const NUMERIC_KEYS = new Set(['wMin', 'wMax', 'hMin', 'hMax', 'sMin', 'sMax', 'wdMin', 'wdMax', 'hdMin', 'hdMax', 'minIncorrectMarks'])
const BOOL_KEYS = new Set(['sameSize', 'allInputsSame', 'allOutputsSame', 'hasTags', 'witnessPassed', 'adminCorrect', 'adminVerified', 'onlyMultipleVariants'])

type StringFilterKey = Exclude<keyof ReviewGroupsFilters, 'page' | 'perPage' | 'reviewerUserId'>

const FILTER_KEY_MAP: Record<string, StringFilterKey> = {
  wMin: 'minWidth',
  wMax: 'maxWidth',
  hMin: 'minHeight',
  hMax: 'maxHeight',
  sMin: 'minSolutions',
  sMax: 'maxSolutions',
  wdMin: 'minWidthDelta',
  wdMax: 'maxWidthDelta',
  hdMin: 'minHeightDelta',
  hdMax: 'maxHeightDelta',
  sameSize: 'sameSize',
  allInputsSame: 'allInputsSame',
  allOutputsSame: 'allOutputsSame',
  hasTags: 'hasTags',
  solverEmail: 'solverEmail',
  hypothesisText: 'hypothesisText',
  taskId: 'taskId',
  dataset: 'dataset',
  modelName: 'modelName',
  concept: 'concept',
  witnessPassed: 'witnessPassed',
  originalTaskId: 'originalTaskId',
  onlyMultipleVariants: 'onlyMultipleVariants',
  userReviewStatus: 'userReviewStatus',
  reviewerEmail: 'reviewerEmail',
  minIncorrectMarks: 'minIncorrectMarks',
  adminReviewStatus: 'adminReviewStatus',
  adminCorrect: 'adminCorrect',
  adminVerified: 'adminVerified',
}

type Preset = { key: string; label: string; active: boolean; apply: () => void }

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

function filtersFromSearchParams(sp: URLSearchParams): ReviewGroupsFilters {
  const f: ReviewGroupsFilters = {}

  for (const key of FILTER_KEYS) {
    if (!sp.has(key)) continue
    const value = sp.get(key)!
    if (BOOL_KEYS.has(key) && value === '') continue
    if (NUMERIC_KEYS.has(key) && value === '0') continue
    f[FILTER_KEY_MAP[key]] = value
  }

  if (!f.minSolutions) f.minSolutions = DEFAULT_MIN_SOLUTIONS
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

const REVIEW_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'unreviewed', label: 'Sin revisar' },
  { value: 'reviewed', label: 'Con revisión' },
  { value: 'any_incorrect', label: 'Alguna incorrecta' },
  { value: 'any_correct', label: 'Alguna correcta' },
]

const ADMIN_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'unreviewed', label: 'Sin revisar' },
  { value: 'needs_revision', label: 'Necesita revisión' },
  { value: 'done', label: 'Hecho' },
  { value: 'pending_review', label: 'Pendiente' },
]

function AdminStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    unreviewed: 'bg-gray-800 text-gray-500',
    pending_review: 'bg-gray-800 text-gray-400',
    needs_revision: 'bg-red-900/40 text-red-400',
    done: 'bg-green-900/40 text-green-400',
  }
  const labels: Record<string, string> = {
    unreviewed: 'Sin revisar',
    pending_review: 'Pendiente',
    needs_revision: 'Necesita rev.',
    done: 'Hecho',
  }
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${colors[status] ?? 'bg-gray-800 text-gray-400'}`}>
      {labels[status] ?? status}
    </span>
  )
}

function DatasetsBadges({ datasets }: { datasets: string[] }) {
  return (
    <div className="flex gap-1.5">
      {datasets.length === 0 && <span className="text-xs text-gray-600">—</span>}
      {datasets.map(ds => (
        <span key={ds} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
          ds === '1' || ds === '1_train' || ds === '1_eval' || ds === '1_test'
            ? 'bg-amber-900/30 text-amber-400'
            : 'bg-sky-900/30 text-sky-400'
        }`}>
          ARC-{ds}
        </span>
      ))}
    </div>
  )
}

export function SyntheticReviewsListPage() {
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

  const { data, isLoading, isFetching, error } = useReviewGroups(appliedFilters)
  const { data: users } = useUsers()
  const { data: modelNames = [] } = useSyntheticModels()
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

  function stripZero(overrides: Record<string, string>): Record<string, string> {
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
    setParams(stripZero({ [key]: value, page: '1' }))
  }, [setParams])

  const handleCommit = useCallback((key: string, value: string) => {
    applyAndCommit(stripZero({ [key]: value, page: '1' }))
  }, [applyAndCommit])

  const handleTextCommit = useCallback((key: string, value: string) => {
    applyAndCommit({ [key]: value.trim(), page: '1' })
  }, [applyAndCommit])

  const toggleFilter = useCallback((key: string, valueOn: string) => {
    applyAndCommit({ [key]: searchParams.get(key) === valueOn ? '' : valueOn, page: '1' })
  }, [applyAndCommit, searchParams])

  const handleClear = () => {
    setCommittedFilterStr('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const presets: Preset[] = [
    {
      key: 'failed-by-users',
      label: 'Fallaron según usuarios',
      active: searchParams.get('userReviewStatus') === 'any_incorrect',
      apply: () => applyAndCommit({ userReviewStatus: searchParams.get('userReviewStatus') === 'any_incorrect' ? '' : 'any_incorrect', page: '1' }),
    },
    {
      key: 'unreviewed',
      label: 'Sin revisar',
      active: searchParams.get('adminReviewStatus') === 'unreviewed',
      apply: () => applyAndCommit({ adminReviewStatus: searchParams.get('adminReviewStatus') === 'unreviewed' ? '' : 'unreviewed', page: '1' }),
    },
    {
      key: 'witness-failed',
      label: 'Witness falló',
      active: searchParams.get('witnessPassed') === 'false',
      apply: () => applyAndCommit({ witnessPassed: searchParams.get('witnessPassed') === 'false' ? '' : 'false', page: '1' }),
    },
  ]

  const v = (key: string) => searchParams.get(key) ?? ''

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
      <h1 className="text-3xl font-bold">Revisiones de Tareas Sintéticas</h1>

      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={p.apply}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              p.active
                ? 'bg-blue-700 text-white'
                : 'border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

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

        <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Modelo</label>
            <select
              value={v('modelName')}
              onChange={(e) => handleCommit('modelName', e.target.value)}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos</option>
              {modelNames.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Concepto</label>
            <input
              type="text"
              value={v('concept')}
              onChange={(e) => handleDrag('concept', e.target.value)}
              onBlur={(e) => handleTextCommit('concept', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTextCommit('concept', (e.target as HTMLInputElement).value) }}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Witness</label>
            <select
              value={v('witnessPassed')}
              onChange={(e) => handleCommit('witnessPassed', e.target.value)}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="true">Pasó</option>
              <option value="false">Falló</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Original task ID</label>
            <input
              type="text"
              value={v('originalTaskId')}
              onChange={(e) => handleDrag('originalTaskId', e.target.value)}
              onBlur={(e) => handleTextCommit('originalTaskId', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTextCommit('originalTaskId', (e.target as HTMLInputElement).value) }}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('task_search.filter_solver')}</label>
            <select
              value={v('solverEmail')}
              onChange={(e) => handleCommit('solverEmail', e.target.value)}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">{t('task_search.all_users')}</option>
              {users?.map(u => (
                <option key={u.id} value={u.email}>{u.email}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('task_search.filter_dataset')}</label>
            <select
              value={v('dataset')}
              onChange={(e) => handleCommit('dataset', e.target.value)}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">{t('task_search.all_datasets')}</option>
              <option value="both">{t('task_search.both_datasets')}</option>
              <option disabled>───</option>
              <option value="1">{t('task_search.dataset_1')}</option>
              <option value="1_train">{t('task_search.dataset_1_train')}</option>
              <option value="1_eval">{t('task_search.dataset_1_eval')}</option>
              <option value="1_test">{t('task_search.dataset_1_test')}</option>
              <option disabled>───</option>
              <option value="2">{t('task_search.dataset_2')}</option>
              <option value="2_train">{t('task_search.dataset_2_train')}</option>
              <option value="2_eval">{t('task_search.dataset_2_eval')}</option>
              <option value="2_test">{t('task_search.dataset_2_test')}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('task_search.filter_hypothesis')}</label>
            <input
              type="text"
              value={v('hypothesisText')}
              onChange={(e) => handleDrag('hypothesisText', e.target.value)}
              onBlur={(e) => handleTextCommit('hypothesisText', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTextCommit('hypothesisText', (e.target as HTMLInputElement).value) }}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('task_search.filter_task_id')}</label>
            <input
              type="text"
              value={v('taskId')}
              onChange={(e) => handleDrag('taskId', e.target.value)}
              onBlur={(e) => handleTextCommit('taskId', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTextCommit('taskId', (e.target as HTMLInputElement).value) }}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Revisión de usuarios</label>
            <select
              value={v('userReviewStatus')}
              onChange={(e) => handleCommit('userReviewStatus', e.target.value)}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              {REVIEW_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Reviewer (email)</label>
            <select
              value={v('reviewerEmail')}
              onChange={(e) => handleCommit('reviewerEmail', e.target.value)}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos</option>
              {users?.map(u => (
                <option key={u.id} value={u.email}>{u.email}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Mín. marcas incorrectas</label>
            <input
              type="number"
              min={1}
              value={v('minIncorrectMarks')}
              onChange={(e) => handleDrag('minIncorrectMarks', e.target.value)}
              onBlur={(e) => handleCommit('minIncorrectMarks', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCommit('minIncorrectMarks', (e.target as HTMLInputElement).value) }}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Revisión admin</label>
            <select
              value={v('adminReviewStatus')}
              onChange={(e) => handleCommit('adminReviewStatus', e.target.value)}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              {ADMIN_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => toggleFilter('allInputsSame', 'true')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              v('allInputsSame') === 'true'
                ? 'bg-purple-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.inputs_same')}
          </button>
          <button
            onClick={() => toggleFilter('allInputsSame', 'false')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              v('allInputsSame') === 'false'
                ? 'bg-purple-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.inputs_vary')}
          </button>
          <button
            onClick={() => toggleFilter('allOutputsSame', 'true')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              v('allOutputsSame') === 'true'
                ? 'bg-purple-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.outputs_same')}
          </button>
          <button
            onClick={() => toggleFilter('allOutputsSame', 'false')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              v('allOutputsSame') === 'false'
                ? 'bg-purple-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.outputs_vary')}
          </button>
          <button
            onClick={() => toggleFilter('sameSize', 'false')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              v('sameSize') === 'false'
                ? 'bg-purple-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.input_diff_output')}
          </button>
          <button
            onClick={() => toggleFilter('sameSize', 'true')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              v('sameSize') === 'true'
                ? 'bg-purple-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.input_eq_output')}
          </button>
          <button
            onClick={() => toggleFilter('hasTags', 'true')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              v('hasTags') === 'true'
                ? 'bg-emerald-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.has_tags')}
          </button>
          <button
            onClick={() => toggleFilter('hasTags', 'false')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              v('hasTags') === 'false'
                ? 'bg-emerald-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {t('task_search.no_tags')}
          </button>
          <button
            onClick={() => toggleFilter('adminCorrect', 'true')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              v('adminCorrect') === 'true'
                ? 'bg-green-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            Admin: correcta
          </button>
          <button
            onClick={() => toggleFilter('adminCorrect', 'false')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              v('adminCorrect') === 'false'
                ? 'bg-red-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            Admin: incorrecta
          </button>
          <button
            onClick={() => toggleFilter('adminVerified', 'true')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              v('adminVerified') === 'true'
                ? 'bg-blue-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            Admin: verificada
          </button>
          <button
            onClick={() => toggleFilter('onlyMultipleVariants', 'true')}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              v('onlyMultipleVariants') === 'true'
                ? 'bg-blue-700 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            Solo múltiples variantes
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
              <th className="px-4 py-3 font-medium">{t('task_search.table.dataset')}</th>
              <th className="px-4 py-3 font-medium">{t('task_search.table.solver_emails')}</th>
              <th className="px-4 py-3 font-medium">{t('task_search.table.solution_count')}</th>
              <th className="px-4 py-3 font-medium">{t('task_search.table.transform')}</th>
              <th className="px-4 py-3 font-medium">Variantes</th>
              <th className="px-4 py-3 font-medium">Witness</th>
              <th className="px-4 py-3 font-medium">Modelos</th>
              <th className="px-4 py-3 font-medium">Concepto</th>
              <th className="px-4 py-3 font-medium">Usuarios</th>
              <th className="px-4 py-3 font-medium">Admin</th>
              <th className="px-4 py-3 font-medium">{t('task_search.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data?.items.map((g) => (
              <tr key={g.originalTaskId} className="transition hover:bg-gray-900/50">
                <td className="px-4 py-3 font-mono text-xs text-blue-400">
                  <Link
                    to={`/admin/synthetic-reviews/${g.originalTaskId}`}
                    className="hover:text-blue-300 hover:underline"
                  >
                    {g.originalTaskId}
                  </Link>
                </td>
                <td className="px-4 py-3"><DatasetsBadges datasets={g.datasets} /></td>
                <td className="px-4 py-3">
                  {g.solvers.length > 0 ? (
                    <div className="flex max-w-[220px] flex-col gap-0.5">
                      {g.solvers.map((s) => (
                        <span key={s.userId} className="truncate text-xs text-gray-300" title={s.hypothesis ?? undefined}>
                          {s.email}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-300">{g.solutionCount}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    g.sameSize ? 'bg-gray-800 text-gray-400' : 'bg-blue-900/30 text-blue-300'
                  }`}>
                    {transformLabel(g.transformLabel)}
                  </span>
                  {!g.sameSize && g.widthDelta !== null && g.heightDelta !== null && (
                    <span className="ml-1 text-[10px] text-gray-500">
                      ({g.widthDelta > 0 ? '+' : ''}{g.widthDelta}
                      ,{g.heightDelta > 0 ? '+' : ''}{g.heightDelta})
                    </span>
                  )}
                  <span className="ml-1 text-[10px] text-gray-600">{g.width}×{g.height}</span>
                </td>
                <td className="px-4 py-3 text-gray-300">{g.totalVariants}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {g.witnessPassedCount > 0 && (
                      <span className="rounded bg-green-600/20 px-2 py-0.5 text-[10px] text-green-400">
                        ✓ {g.witnessPassedCount}
                      </span>
                    )}
                    {g.witnessFailedCount > 0 && (
                      <span className="rounded bg-red-900/30 px-2 py-0.5 text-[10px] text-red-400">
                        ✗ {g.witnessFailedCount}
                      </span>
                    )}
                    {g.witnessPassedCount === 0 && g.witnessFailedCount === 0 && (
                      <span className="text-[10px] text-gray-600">-</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex max-w-[160px] flex-wrap gap-1">
                    {g.models.length === 0 && <span className="text-[10px] text-gray-600">-</span>}
                    {g.models.map((m) => (
                      <span key={m} className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">{m}</span>
                    ))}
                  </div>
                </td>
                <td className="max-w-[160px] truncate px-4 py-3 text-xs text-gray-400" title={g.concepts[0] ?? undefined}>
                  {g.concepts[0] ?? '—'}
                  {g.concepts.length > 1 && <span className="text-gray-600"> +{g.concepts.length - 1}</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400">
                      {g.userReview.reviewedVariants}/{g.totalVariants} revisadas
                    </span>
                    {g.userReview.incorrectMarks > 0 && (
                      <span className="text-[10px] text-red-400">✗ {g.userReview.incorrectMarks}</span>
                    )}
                    {g.userReview.correctMarks > 0 && (
                      <span className="text-[10px] text-green-400">✓ {g.userReview.correctMarks}</span>
                    )}
                    {g.userReview.distinctReviewers > 0 && (
                      <span className="max-w-[120px] truncate text-[10px] text-gray-500" title={g.userReview.reviewerEmails.join(', ')}>
                        {g.userReview.reviewerEmails.join(', ')}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3"><AdminStatusBadge status={g.adminReview.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Link
                      to={`/admin/synthetic-reviews/${g.originalTaskId}`}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Revisar
                    </Link>
                    <Link
                      to={`/admin/tasks/${g.originalTaskId}/solutions`}
                      className="text-xs text-gray-500 hover:text-gray-300 hover:underline"
                    >
                      {t('task_search.view_solutions')}
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                  No se encontraron tareas
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