import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys } from '../../lib/api'

export function useDeleteProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      void queryClient.invalidateQueries({ queryKey: queryKeys.runtimeStatus })
    },
  })
}
