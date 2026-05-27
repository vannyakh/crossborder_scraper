import { useEffect } from 'react'
import { localeToTag } from '../../locale/config'
import { useLocaleStore } from '../../stores/locale-store'

/** Keeps document `lang` in sync with the persisted app locale. */
export function LocaleSync() {
  const locale = useLocaleStore((state) => state.locale)

  useEffect(() => {
    const tag = localeToTag(locale)
    document.documentElement.lang = tag.split('-')[0] ?? 'en'
  }, [locale])

  return null
}
