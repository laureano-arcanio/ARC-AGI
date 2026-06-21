import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation, LanguageSwitcher } from '../lib/i18n'
import { useAuth } from '../lib/auth'

type LayoutProps = {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAdmin, userId, clearUser } = useAuth()

  const handleLogout = () => {
    clearUser()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-6">
          <a href="/" className="text-lg font-semibold tracking-tight">
            {t('nav.brand')}
          </a>
          <div className="flex items-center gap-4 text-sm">
            <a href="/" className="text-gray-400 transition hover:text-white">
              {t('nav.home')}
            </a>
            {isAdmin && (
              <>
                <a href="/admin/users" className="text-amber-400 transition hover:text-amber-300">
                  {t('nav.admin_users')}
                </a>
                <a href="/admin/batches" className="text-amber-400 transition hover:text-amber-300">
                  {t('nav.admin_batches')}
                </a>
              </>
            )}
            {!isAdmin && userId && (
              <a href="/my-tasks" className="text-gray-400 transition hover:text-white">
                {t('nav.my_tasks')}
              </a>
            )}
            <a href="/dashboard" className="text-gray-400 transition hover:text-white">
              {t('nav.dashboard')}
            </a>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {userId && (
              <button
                onClick={handleLogout}
                className="rounded-md border border-gray-700 px-2.5 py-1 text-xs text-gray-400 transition hover:border-red-800 hover:text-red-400"
              >
                {t('nav.logout')}
              </button>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-[1440px] px-6 py-12">{children}</main>
    </div>
  )
}
