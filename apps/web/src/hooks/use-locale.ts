import { useMemo } from 'react'
import { localeToTag } from '../locale/config'
import { createTranslator } from '../locale/translator'
import type { AppLocale, TranslateFn } from '../locale/types'
import { useLocaleStore } from '../stores/locale-store'

export function useLocale() {
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)

  const t = useMemo(() => createTranslator(locale), [locale])

  return {
    locale,
    setLocale,
    tag: localeToTag(locale),
    dir: 'ltr' as const,
    t,
  }
}

export type { AppLocale, TranslateFn }
