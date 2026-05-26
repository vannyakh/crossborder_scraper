import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type ProductSummary } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function useProductsQuery(limit = 100) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.products(limit),
    queryFn: () => api<{ items: ProductSummary[]; total: number }>(`/products?limit=${limit}`),
    enabled: isAuthenticated,
  })
}

export function useProductQuery(id: number | undefined) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.product(id ?? 0),
    queryFn: () => api<Record<string, unknown>>(`/products/${id}`),
    enabled: isAuthenticated && id != null && !Number.isNaN(id),
  })
}
