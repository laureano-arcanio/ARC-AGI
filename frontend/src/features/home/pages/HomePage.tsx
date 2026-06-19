import { useTranslation } from '../../../lib/i18n'

export function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center gap-8 pt-24 text-center">
      <h1 className="text-5xl font-bold">{t('home.title')}</h1>
      <p className="max-w-md text-gray-400">{t('home.subtitle')}</p>
      <a
        href="/solve/random"
        className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-700"
      >
        {t('home.start')}
      </a>
    </div>
  )
}
