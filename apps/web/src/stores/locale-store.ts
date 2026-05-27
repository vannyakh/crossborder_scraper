import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_LOCALE, detectBrowserLocale, isAppLocale } from '../locale/config'
import type { AppLocale } from '../locale/types'

type LocaleState = {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: detectBrowserLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'crossborder-locale',
      version: 1,
      partialize: (state) => ({ locale: state.locale }),
      migrate: (persisted) => {
        const state = persisted as { locale?: unknown }
        return {
          locale: isAppLocale(state.locale) ? state.locale : DEFAULT_LOCALE,
        }
      },
    },
  ),
)

export type { AppLocale }
