import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useTranslation, LanguageSwitcher } from '../lib/i18n'
import { useAuth } from '../lib/auth'

type LayoutProps = {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const { isAdmin, userId, clearUser } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const handleLogout = () => {
    setMenuOpen(false)
    clearUser()
    navigate('/')
  }

  const navLinks = (
    <>
      {isAdmin && (
        <>
          <Link to="/admin/users" className="text-amber-400 transition hover:text-amber-300">
            {t('nav.admin_users')}
          </Link>
          <Link to="/admin/batches" className="text-amber-400 transition hover:text-amber-300">
            {t('nav.admin_batches')}
          </Link>
          <Link to="/admin/leaderboard" className="text-amber-400 transition hover:text-amber-300">
            {t('nav.admin_leaderboard')}
          </Link>
          <Link to="/admin/activity" className="text-amber-400 transition hover:text-amber-300">
            {t('nav.admin_activity')}
          </Link>
          <Link to="/admin/tasks" className="text-amber-400 transition hover:text-amber-300">
            {t('nav.admin_tasks')}
          </Link>
          <Link to="/admin/synthetic-reviews" className="text-amber-400 transition hover:text-amber-300">
            {t('nav.synthetic_reviews')}
          </Link>
        </>
      )}
      {!isAdmin && userId && (
        <>
          <Link to="/my-tasks" className="text-gray-400 transition hover:text-white">
            {t('nav.my_tasks')}
          </Link>
          <Link to="/my-reviews" className="text-purple-400 transition hover:text-purple-300">
            {t('nav.my_reviews')}
          </Link>
        </>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-4 py-3 sm:px-6">
        <div className="mx-auto flex items-center gap-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            {t('nav.brand')}
          </Link>
          <div className="hidden items-center gap-4 text-sm md:flex">{navLinks}</div>
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
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? t('nav.close_menu') : t('nav.open_menu')}
              className="rounded-md border border-gray-700 p-2 text-gray-300 transition hover:bg-gray-800 hover:text-white md:hidden"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="mt-3 flex flex-col gap-1 border-t border-gray-800 pt-3 md:hidden">
            {navLinks}
          </div>
        )}
      </nav>
      <main className="px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  )
}
