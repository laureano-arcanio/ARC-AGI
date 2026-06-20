import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useCreateUser } from '../queries'

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [uuidInput, setUuidInput] = useState('')
  const [lookupError, setLookupError] = useState('')

  const createUserMutation = useCreateUser()

  const handleCreateUser = async () => {
    try {
      const user = await createUserMutation.mutateAsync()
      navigate(`/solve/${user.uuid}/random`)
    } catch {
      setLookupError(t('dashboard.create_error'))
    }
  }

  const handleUseUuid = () => {
    const trimmed = uuidInput.trim()
    if (!trimmed) {
      setLookupError(t('dashboard.uuid_empty'))
      return
    }
    setLookupError('')
    navigate(`/solve/${encodeURIComponent(trimmed)}/random`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleUseUuid()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 pt-24 text-center">
      <h1 className="text-5xl font-bold">{t('dashboard.title')}</h1>
      <p className="max-w-md text-gray-400">{t('dashboard.subtitle')}</p>

      <div className="flex flex-col gap-6">
        <button
          onClick={handleCreateUser}
          disabled={createUserMutation.isPending}
          className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {createUserMutation.isPending
            ? t('dashboard.creating')
            : t('dashboard.create')}
        </button>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-700" />
          <span className="text-sm text-gray-500">{t('dashboard.or')}</span>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={uuidInput}
              onChange={(e) => {
                setUuidInput(e.target.value)
                setLookupError('')
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('dashboard.uuid_placeholder')}
              className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleUseUuid}
              disabled={!uuidInput.trim()}
              className="rounded-lg bg-gray-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-600 disabled:opacity-50"
            >
              {t('dashboard.use_uuid')}
            </button>
          </div>
          {lookupError && (
            <p className="text-sm text-red-400">{lookupError}</p>
          )}
        </div>
      </div>
    </div>
  )
}
