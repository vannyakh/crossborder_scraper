import { useMemo } from 'react'
import { buildNavEntries, type NavEntry } from '../config/nav'
import { useLocale } from './use-locale'

export function useNavEntries(): NavEntry[] {
  const { t } = useLocale()
  return useMemo(() => buildNavEntries(t), [t])
}
