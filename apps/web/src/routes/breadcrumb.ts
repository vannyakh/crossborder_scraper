import type { LucideIcon } from 'lucide-react'
import type { TranslateFn } from '../locale/types'
import { matchBreadcrumbSegments, type BreadcrumbSegmentDef } from './route-config'

export type BreadcrumbCrumb = {
  label: string
  to?: string
  icon?: LucideIcon
}

function resolveSegment(segment: BreadcrumbSegmentDef, t: TranslateFn): BreadcrumbCrumb {
  const label = segment.label ?? (segment.labelKey ? t(segment.labelKey) : '')
  return {
    label,
    to: segment.path,
    icon: segment.icon,
  }
}

export function buildBreadcrumbTrail(pathname: string, t: TranslateFn): BreadcrumbCrumb[] {
  const segments = matchBreadcrumbSegments(pathname)
  const crumbs = segments.map((s) => resolveSegment(s, t))

  if (crumbs.length === 1 && crumbs[0].to === '/') {
    return [{ label: crumbs[0].label, icon: crumbs[0].icon }]
  }

  return crumbs
}
