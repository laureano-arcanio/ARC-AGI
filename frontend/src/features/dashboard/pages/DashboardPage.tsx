import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useCreateUser, useLogin } from '../queries'

function getRedirectPath(role: string): string {
  return role === 'admin' ? '/admin/users' : '/my-tasks'
}

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const createUserMutation = useCreateUser()
  const loginMutation = useLogin()

  const handleCreateUser = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('dashboard.fields_required'))
      return
    }
    setError('')
    try {
      const user = await createUserMutation.mutateAsync({
        email: email.trim(),
        password,
      })
      const loginResult = await loginMutation.mutateAsync({
        email: email.trim(),
        password,
      })
      setUser(loginResult.user.id, loginResult.user.email, loginResult.user.role, loginResult.accessToken)
      navigate(getRedirectPath(user.role))
    } catch {
      setError(t('dashboard.create_error'))
    }
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('dashboard.fields_required'))
      return
    }
    setError('')
    try {
      const result = await loginMutation.mutateAsync({
        email: email.trim(),
        password,
      })
      setUser(result.user.id, result.user.email, result.user.role, result.accessToken)
      navigate(getRedirectPath(result.user.role))
    } catch {
      setError(t('dashboard.invalid_credentials'))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  }

  const pending =
    createUserMutation.isPending || loginMutation.isPending

  return (
    <div className="flex flex-col items-center justify-center gap-8 pt-24 text-center">
      <h1 className="text-5xl font-bold">{t('dashboard.title')}</h1>
      <p className="max-w-md text-gray-400">{t('dashboard.subtitle')}</p>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError('')
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('dashboard.email_placeholder')}
          autoComplete="email"
          className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError('')
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('dashboard.password_placeholder')}
          autoComplete="current-password"
          className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleLogin}
            disabled={pending}
            className="flex-1 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {t('dashboard.login')}
          </button>
          <button
            onClick={handleCreateUser}
            disabled={pending}
            className="flex-1 rounded-xl border border-gray-700 bg-transparent px-6 py-3 text-sm font-semibold text-gray-300 transition hover:bg-gray-800 disabled:opacity-50"
          >
            {createUserMutation.isPending
              ? t('dashboard.creating')
              : t('dashboard.create')}
          </button>
        </div>
      </div>
    </div>
  )
}
