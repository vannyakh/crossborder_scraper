import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys } from '../../lib/api'

export function useDeleteFileMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (path: string) => api(`/files/${encodeURIComponent(path)}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.files })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      void queryClient.invalidateQueries({ queryKey: queryKeys.runtimeStatus })
    },
  })
}
