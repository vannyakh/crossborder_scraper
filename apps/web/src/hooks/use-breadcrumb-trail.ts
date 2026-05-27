import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { buildBreadcrumbTrail, type BreadcrumbCrumb } from '../config/breadcrumb'
import { useLocale } from './use-locale'

export function useBreadcrumbTrail(): BreadcrumbCrumb[] {
  const { pathname } = useLocation()
  const { t } = useLocale()

  return useMemo(() => buildBreadcrumbTrail(pathname, t), [pathname, t])
}

export type { BreadcrumbCrumb }
