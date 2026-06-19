import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

vi.mock('../lib/i18n', () => ({
  useTranslation: () => ({
    locale: 'en',
    setLocale: vi.fn(),
    t: (key: string, params?: Record<string, string | number>) => {
      if (!params) return key
      return key.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`))
    },
  }),
  LanguageSwitcher: () => null,
}))
