import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useSyntheticModels, useSyntheticTasks } from '../queries'
import type { ListFilters } from '../api'

const PAGE_SIZES = [10, 20, 50, 100]
const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pending_review', label: 'Pendiente' },
  { value: 'needs_revision', label: 'Necesita revisión' },
  { value: 'done', label: 'Hecho' },
]

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

export function SyntheticReviewsListPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const perPage = PAGE_SIZES.includes(Number(searchParams.get('perPage')))
    ? Number(searchParams.get('perPage'))
    : 50
  const modelName = searchParams.get('modelName') ?? ''
  const witnessParam = searchParams.get('witnessPassed')
  const witnessPassed = witnessParam === 'true' ? true : witnessParam === 'false' ? false : undefined
  const reviewStatus = searchParams.get('reviewStatus') ?? ''
  const correctParam = searchParams.get('correct')
  const correctFilter = correctParam === 'true' ? true : correctParam === 'false' ? false : undefined
  const verifiedParam = searchParams.get('verified')
  const verifiedFilter = verifiedParam === 'true' ? true : verifiedParam === 'false' ? false : undefined
  const originalTaskId = searchParams.get('originalTaskId') ?? ''
  const concept = searchParams.get('concept') ?? ''
  const onlyMultipleVariants = searchParams.get('onlyMultipleVariants') === 'true'

  const filters: ListFilters = useMemo(() => ({
    page,
    perPage,
    modelName: modelName || undefined,
    witnessPassed,
    reviewStatus: reviewStatus || undefined,
    correct: correctFilter,
    verified: verifiedFilter,
    originalTaskId: originalTaskId || undefined,
    concept: concept || undefined,
    onlyMultipleVariants: onlyMultipleVariants || undefined,
  }), [page, perPage, modelName, witnessPassed, reviewStatus, correctFilter, verifiedFilter, originalTaskId, concept, onlyMultipleVariants])

  const { data, isLoading } = useSyntheticTasks(filters)
  const { data: modelNames = [] } = useSyntheticModels()

  const setParams = useCallback((overrides: Record<string, string>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, val] of Object.entries(overrides)) {
        if (val === '') next.delete(key)
        else next.set(key, val)
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const applyFilter = useCallback((overrides: Record<string, string>) => {
    setParams({ ...overrides, page: '1' })
  }, [setParams])

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

  const totalPages = data?.totalPages ?? 1

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Revisiones Sintéticas</h1>

      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Modelo</label>
            <select
              value={modelName}
              onChange={(e) => applyFilter({ modelName: e.target.value })}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos</option>
              {modelNames.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Witness</label>
            <select
              value={witnessParam ?? ''}
              onChange={(e) => applyFilter({ witnessPassed: e.target.value })}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="true">Pasó</option>
              <option value="false">Falló</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Correcta</label>
            <select
              value={correctParam ?? ''}
              onChange={(e) => applyFilter({ correct: e.target.value })}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="true">Correcta</option>
              <option value="false">Incorrecta</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Verificada</label>
            <select
              value={verifiedParam ?? ''}
              onChange={(e) => applyFilter({ verified: e.target.value })}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="true">Verificada</option>
              <option value="false">No verificada</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Estado revisión</label>
            <select
              value={reviewStatus}
              onChange={(e) => applyFilter({ reviewStatus: e.target.value })}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Tarea original ID</label>
            <input
              type="text"
              value={originalTaskId}
              onChange={(e) => applyFilter({ originalTaskId: e.target.value })}
              placeholder="id,id,..."
              className="w-36 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Concepto</label>
            <input
              type="text"
              value={concept}
              onChange={(e) => applyFilter({ concept: e.target.value })}
              className="w-48 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="onlyMultiple"
              checked={onlyMultipleVariants}
              onChange={(e) =>
                applyFilter({ onlyMultipleVariants: e.target.checked ? 'true' : '' })
              }
              className="h-3 w-3 rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-0"
            />
            <label htmlFor="onlyMultiple" className="text-xs text-gray-400 cursor-pointer">
              Solo múltiples variantes
            </label>
          </div>
          <div>
            <button
              onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
              className="rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition hover:border-gray-500 hover:text-gray-300"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Mostrando</span>
          <span className="text-gray-200">{(page - 1) * perPage + 1}</span>
          <span>-</span>
          <span className="text-gray-200">{Math.min(page * perPage, data?.total ?? 0)}</span>
          <span>de</span>
          <span className="text-gray-200">{data?.total ?? 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Por página</span>
          <select
            value={perPage}
            onChange={(e) => applyFilter({ perPage: e.target.value })}
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
              <th className="px-4 py-3 font-medium">Original</th>
              <th className="px-4 py-3 font-medium">Modelo</th>
              <th className="px-4 py-3 font-medium">Witness</th>
              <th className="px-4 py-3 font-medium">Revisión</th>
              <th className="px-4 py-3 font-medium">Verif.</th>
              <th className="px-4 py-3 font-medium">Concepto</th>
              <th className="px-4 py-3 font-medium">Hipótesis</th>
              <th className="px-4 py-3 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data?.items.map((task, i) => {
              const prevId = i > 0 ? data.items[i - 1].originalTaskId : null
              const sameGroup = task.originalTaskId === prevId
              const groupStart = !sameGroup

              return (
              <tr key={task.id} className={`transition hover:bg-gray-900/50 ${groupStart ? 'bg-gray-900/30' : ''}`}>
                <td className="px-4 py-3">
                  <Link
                    to={`/admin/tasks/${task.originalTaskId}/solutions`}
                    className="font-mono text-xs text-blue-400 hover:underline"
                  >
                    {task.originalTaskId}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-gray-300">{task.modelName}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span>
                      {task.witnessPassed ? (
                        <span className="rounded bg-green-600/20 px-2 py-0.5 text-xs text-green-400">✓ witness</span>
                      ) : (
                        <span className="rounded bg-red-900/30 px-2 py-0.5 text-xs text-red-400">
                          ✗ witness ({task.witnessNPassed}/{task.witnessNTotal})
                        </span>
                      )}
                    </span>
                    {task.correct === true && (
                      <span className="rounded bg-green-900/30 px-2 py-0.5 text-[10px] text-green-400">
                        ✓ correcta
                      </span>
                    )}
                    {task.correct === false && (
                      <span className="rounded bg-red-900/30 px-2 py-0.5 text-[10px] text-red-400">
                        ✗ incorrecta
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <ReviewStatusBadge status={task.reviewStatus} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  {task.verified ? (
                    <span className="rounded bg-blue-900/30 px-2 py-0.5 text-[10px] text-blue-400">✓</span>
                  ) : (
                    <span className="text-[10px] text-gray-600">—</span>
                  )}
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-xs text-gray-400" title={task.concept ?? undefined}>
                  {task.concept ?? '—'}
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-xs text-gray-400" title={task.hypothesis ?? undefined}>
                  {task.hypothesis ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/admin/synthetic-reviews/${task.id}`}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Revisar
                  </Link>
                </td>
              </tr>
              )
            })}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No se encontraron tareas sintéticas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setParams({ page: String(Math.max(1, page - 1)) })}
            disabled={page <= 1}
            className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-400 transition hover:border-gray-500 hover:text-gray-200 disabled:opacity-40"
          >
            Anterior
          </button>
          {renderPageNumbers(page, totalPages, (p) => setParams({ page: String(p) }))}
          <button
            onClick={() => setParams({ page: String(Math.min(totalPages, page + 1)) })}
            disabled={page >= totalPages}
            className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-400 transition hover:border-gray-500 hover:text-gray-200 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}

function ReviewStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending_review: 'bg-gray-800 text-gray-400',
    needs_revision: 'bg-red-900/40 text-red-400',
    done: 'bg-green-900/40 text-green-400',
  }
  const labels: Record<string, string> = {
    pending_review: 'Pendiente',
    needs_revision: 'Nece. revisión',
    done: 'Hecho',
  }
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${colors[status] ?? 'bg-gray-800 text-gray-400'}`}>
      {labels[status] ?? status}
    </span>
  )
}
