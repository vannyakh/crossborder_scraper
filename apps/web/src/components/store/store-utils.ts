import {
  Brain,
  CircleDot,
  Database,
  HardDrive,
  Link2,
  Music2,
  Puzzle,
  Rabbit,
  Server,
  Share2,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { StoreCatalogItem, StoreInstalled } from '../../lib/api'

export const STORE_CATEGORY_LABEL: Record<string, string> = {
  database: 'Database',
  cache: 'Cache',
  queue: 'Queue',
  search: 'Search',
  ai: 'AI runtime',
  ecommerce: 'E-commerce scrape',
  social: 'Social scrape',
  custom: 'Custom scrape',
}

export const STORE_CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'social', label: 'Social' },
  { id: 'custom', label: 'Custom' },
  { id: 'database', label: 'Databases' },
  { id: 'cache', label: 'Cache' },
  { id: 'queue', label: 'Queues' },
  { id: 'ai', label: 'AI' },
] as const

export type StoreCategoryFilter = (typeof STORE_CATEGORY_FILTERS)[number]['id']
export type StoreViewMode = 'grid' | 'list'

export const STORE_PAGE_SIZE_OPTIONS = [6, 9, 12, 24] as const

const PLUGIN_ICONS: Record<string, LucideIcon> = {
  redis: CircleDot,
  postgresql: Database,
  mysql: Database,
  mongodb: Server,
  memcached: HardDrive,
  rabbitmq: Rabbit,
  ollama: Brain,
  brain: Brain,
  'circle-dot': CircleDot,
  database: Database,
  server: Server,
  '1688': Database,
  taobao: Database,
  aliexpress: Database,
  instagram: Share2,
  tiktok: Music2,
  linkedin: Link2,
  custom_plugin: Puzzle,
}

export function pluginIcon(id: string, iconKey?: string | null): LucideIcon {
  if (iconKey && PLUGIN_ICONS[iconKey]) return PLUGIN_ICONS[iconKey]
  return PLUGIN_ICONS[id] ?? Server
}

export function statusTone(status: string): 'success' | 'running' | 'neutral' | 'danger' {
  if (status === 'running' || status === 'external') return 'success'
  if (status === 'installing') return 'running'
  if (status === 'error') return 'danger'
  return 'neutral'
}

export function filterCatalog(items: StoreCatalogItem[], category: StoreCategoryFilter) {
  if (category === 'all') return items
  return items.filter((item) => item.category === category)
}

export function searchCatalog(items: StoreCatalogItem[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => {
    const haystack = [
      item.name,
      item.id,
      item.description,
      item.category,
      item.docker_image,
      ...item.tags,
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function searchInstalled(items: StoreInstalled[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => {
    const haystack = [
      item.name,
      item.plugin_id,
      item.category,
      item.mode ?? '',
      item.status,
      String(item.config.host ?? ''),
      String(item.config.port ?? ''),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    total,
    totalPages,
    page: safePage,
    pageSize,
  }
}

export function buildPageNumbers(current: number, totalPages: number, window = 5) {
  const pages: number[] = []
  const start = Math.max(1, current - Math.floor(window / 2))
  const end = Math.min(totalPages, start + window - 1)
  const adjustedStart = Math.max(1, end - window + 1)
  for (let i = adjustedStart; i <= end; i += 1) pages.push(i)
  return pages
}

/** Search, pagination, and view mode for store list tabs */
export function useStoreListState(defaultPageSize: number) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [viewMode, setViewMode] = useState<StoreViewMode>('grid')

  return {
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    viewMode,
    setViewMode,
  }
}

export function useStorePagedList<T>(items: T[], state: ReturnType<typeof useStoreListState>) {
  const pagination = useMemo(
    () => paginateItems(items, state.page, state.pageSize),
    [items, state.page, state.pageSize],
  )

  useEffect(() => {
    state.setPage(1)
  }, [state.search, state.pageSize, items.length, state.setPage])

  useEffect(() => {
    if (state.page > pagination.totalPages) {
      state.setPage(pagination.totalPages)
    }
  }, [state.page, pagination.totalPages, state.setPage])

  return pagination
}
