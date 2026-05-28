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

export function useListPageState(defaultPageSize = 20) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  return { search, setSearch, page, setPage, pageSize, setPageSize }
}

export function usePagedList<T>(
  items: T[],
  page: number,
  pageSize: number,
  search: string,
  setPage: (n: number) => void,
) {
  const pagination = useMemo(() => paginateItems(items, page, pageSize), [items, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [search, pageSize, items.length, setPage])

  useEffect(() => {
    if (page > pagination.totalPages) {
      setPage(pagination.totalPages)
    }
  }, [page, pagination.totalPages, setPage])

  return pagination
}

export const LIST_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
