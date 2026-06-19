import { useTranslation } from './I18nProvider'
import type { Locale } from './translations'

const OPTIONS: { value: Locale; labelKey: string }[] = [
  { value: 'es', labelKey: 'language.es' },
  { value: 'en', labelKey: 'language.en' },
]

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation()

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
      aria-label={t('language.en')}
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {t(opt.labelKey)}
        </option>
      ))}
    </select>
  )
}
