import { useEffect, useMemo, useState } from 'react'

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
  }
}

export function buildPageNumbers(current: number, totalPages: number, window = 5) {
  const pages: number[] = []
  const end = Math.min(totalPages, Math.max(1, current - Math.floor(window / 2)) + window - 1)
  const start = Math.max(1, end - window + 1)
  for (let i = start; i <= end; i += 1) pages.push(i)
  return pages
}

export function useInventoryListState(defaultPageSize = 20) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  return { search, setSearch, page, setPage, pageSize, setPageSize }
}

export function useInventoryPagedList<T>(
  items: T[],
  state: ReturnType<typeof useInventoryListState>,
) {
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

export const INVENTORY_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
