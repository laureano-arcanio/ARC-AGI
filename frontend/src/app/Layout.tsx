import type { ReactNode } from 'react'
import { useTranslation, LanguageSwitcher } from '../lib/i18n'

type LayoutProps = {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation()

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
            <a href="/dashboard" className="text-gray-400 transition hover:text-white">
              {t('nav.dashboard')}
            </a>
            <a href="/solve/default/random" className="text-gray-400 transition hover:text-white">
              {t('nav.solve')}
            </a>
          </div>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-[1440px] px-6 py-12">{children}</main>
    </div>
  )
}
