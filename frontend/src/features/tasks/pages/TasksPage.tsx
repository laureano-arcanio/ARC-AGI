import { useState } from 'react'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useTasksStats } from '../queries'
import type { TasksFilters } from '../types'

const PAGE_SIZES = [10, 20, 50, 100]

function buildFilters(form: {
  userId: string
  minWidth: string
  maxWidth: string
  minHeight: string
  maxHeight: string
  minSolutions: string
  maxSolutions: string
}): TasksFilters {
  const f: TasksFilters = {}
  if (form.userId.trim()) f.userId = form.userId.trim()
  if (form.minWidth.trim()) f.minWidth = form.minWidth.trim()
  if (form.maxWidth.trim()) f.maxWidth = form.maxWidth.trim()
  if (form.minHeight.trim()) f.minHeight = form.minHeight.trim()
  if (form.maxHeight.trim()) f.maxHeight = form.maxHeight.trim()
  if (form.minSolutions.trim()) f.minSolutions = form.minSolutions.trim()
  if (form.maxSolutions.trim()) f.maxSolutions = form.maxSolutions.trim()
  return f
}

export function TasksPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(100)
  const [filterValues, setFilterValues] = useState({
    userId: '',
    minWidth: '',
    maxWidth: '',
    minHeight: '',
    maxHeight: '',
    minSolutions: '',
    maxSolutions: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<TasksFilters>({})

  const { data, isLoading, error } = useTasksStats(page, perPage, appliedFilters)

  const totalPages = data?.totalPages ?? 1

  const handleApplyFilters = () => {
    setPage(1)
    setAppliedFilters(buildFilters(filterValues))
  }

  const handleClearFilters = () => {
    setFilterValues({
      userId: '',
      minWidth: '',
      maxWidth: '',
      minHeight: '',
      maxHeight: '',
      minSolutions: '',
      maxSolutions: '',
    })
    setPage(1)
    setAppliedFilters({})
  }

  const handlePerPageChange = (value: number) => {
    setPerPage(value)
    setPage(1)
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
        {t('tasks.loading')}
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">{t('tasks.unauthorized')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">{t('tasks.error')}</p>
        <p className="mt-1 text-sm">{error.message}</p>
      </div>
    )
  }

  const inputClass =
    'w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none'

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">{t('tasks.title')}</h1>

      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('tasks.filter_user')}</label>
            <input
              type="text"
              value={filterValues.userId}
              onChange={(e) =>
                setFilterValues((v) => ({ ...v, userId: e.target.value }))
              }
              placeholder={t('tasks.filter_user_placeholder')}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('tasks.filter_min_width')}</label>
            <input
              type="number"
              value={filterValues.minWidth}
              onChange={(e) =>
                setFilterValues((v) => ({ ...v, minWidth: e.target.value }))
              }
              placeholder="0"
              min={0}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('tasks.filter_max_width')}</label>
            <input
              type="number"
              value={filterValues.maxWidth}
              onChange={(e) =>
                setFilterValues((v) => ({ ...v, maxWidth: e.target.value }))
              }
              placeholder="30"
              min={0}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('tasks.filter_min_height')}</label>
            <input
              type="number"
              value={filterValues.minHeight}
              onChange={(e) =>
                setFilterValues((v) => ({ ...v, minHeight: e.target.value }))
              }
              placeholder="0"
              min={0}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('tasks.filter_max_height')}</label>
            <input
              type="number"
              value={filterValues.maxHeight}
              onChange={(e) =>
                setFilterValues((v) => ({ ...v, maxHeight: e.target.value }))
              }
              placeholder="30"
              min={0}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('tasks.filter_min_solutions')}</label>
            <input
              type="number"
              value={filterValues.minSolutions}
              onChange={(e) =>
                setFilterValues((v) => ({ ...v, minSolutions: e.target.value }))
              }
              placeholder="0"
              min={0}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('tasks.filter_max_solutions')}</label>
            <input
              type="number"
              value={filterValues.maxSolutions}
              onChange={(e) =>
                setFilterValues((v) => ({ ...v, maxSolutions: e.target.value }))
              }
              placeholder=""
              min={0}
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleApplyFilters}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            {t('tasks.apply_filters')}
          </button>
          <button
            onClick={handleClearFilters}
            className="rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition hover:border-gray-500 hover:text-gray-300"
          >
            {t('tasks.clear_filters')}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{t('tasks.showing')}</span>
          <span className="text-gray-200">{(page - 1) * perPage + 1}</span>
          <span>-</span>
          <span className="text-gray-200">{Math.min(page * perPage, data?.total ?? 0)}</span>
          <span>{t('tasks.of')}</span>
          <span className="text-gray-200">{data?.total ?? 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{t('tasks.per_page')}</span>
          <select
            value={perPage}
            onChange={(e) => handlePerPageChange(Number(e.target.value))}
            className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t('tasks.table.task_id')}</th>
              <th className="px-4 py-3 font-medium">{t('tasks.table.complete')}</th>
              <th className="px-4 py-3 font-medium">{t('tasks.table.incomplete')}</th>
              <th className="px-4 py-3 font-medium">{t('tasks.table.abandoned')}</th>
              <th className="px-4 py-3 font-medium">{t('tasks.table.total')}</th>
              <th className="px-4 py-3 font-medium">{t('tasks.table.width')}</th>
              <th className="px-4 py-3 font-medium">{t('tasks.table.height')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data?.items.map((task) => {
              const total = task.completeCount + task.incompleteCount + task.abandonedCount
              return (
                <tr key={task.taskId} className="transition hover:bg-gray-900/50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-400">
                    {task.taskId}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-green-600/20 px-2 py-0.5 text-xs text-green-400">
                      {task.completeCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-yellow-600/20 px-2 py-0.5 text-xs text-yellow-400">
                      {task.incompleteCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-orange-600/20 px-2 py-0.5 text-xs text-orange-400">
                      {task.abandonedCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{total}</td>
                  <td className="px-4 py-3 text-gray-300">{task.width}</td>
                  <td className="px-4 py-3 text-gray-300">{task.height}</td>
                </tr>
              )
            })}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {t('tasks.no_results')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-400 transition hover:border-gray-500 hover:text-gray-200 disabled:opacity-40"
          >
            {t('tasks.prev')}
          </button>
          {renderPageNumbers(page, totalPages, setPage)}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-400 transition hover:border-gray-500 hover:text-gray-200 disabled:opacity-40"
          >
            {t('tasks.next')}
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
      <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-600">
        ...
      </span>
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
