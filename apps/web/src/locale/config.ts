import type { AppLocale } from './types'

export type LocaleOption = {
  value: AppLocale
  /** BCP 47 tag for Chakra LocaleProvider */
  tag: string
  /** Native language name (shown in the selector) */
  nativeName: string
}

export const LOCALE_OPTIONS: LocaleOption[] = [
  { value: 'en', tag: 'en-US', nativeName: 'English' },
  { value: 'zh', tag: 'zh-CN', nativeName: '中文' },
  { value: 'km', tag: 'km-KH', nativeName: 'ភាសាខ្មែរ' },
]

export const DEFAULT_LOCALE: AppLocale = 'en'

export function localeToTag(locale: AppLocale): string {
  return LOCALE_OPTIONS.find((option) => option.value === locale)?.tag ?? 'en-US'
}

export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('zh')) return 'zh'
  if (lang.startsWith('km')) return 'km'
  return 'en'
}

export function isAppLocale(value: unknown): value is AppLocale {
  return value === 'en' || value === 'zh' || value === 'km'
}
