import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type FileEntry } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function useFilesQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.files,
    queryFn: () => api<{ items: FileEntry[]; output_dir: string }>('/files'),
    enabled: isAuthenticated,
  })
}
