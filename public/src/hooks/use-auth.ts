import { useMutation, useQueryClient } from '@tanstack/react-query'
import { checkHealth } from '../lib/api'
import { useAuthStore } from '../stores/auth-store'

export function useAuth() {
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const operatorName = useAuthStore((s) => s.operatorName)
  const login = useAuthStore((s) => s.login)
  const logoutStore = useAuthStore((s) => s.logout)

  const logout = () => {
    logoutStore()
    queryClient.clear()
  }

  const connectMutation = useMutation({
    mutationFn: async (payload: { token?: string; name?: string }) => {
      await checkHealth()
      login(payload)
    },
  })

  return {
    isAuthenticated,
    operatorName,
    logout,
    connect: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    connectError: connectMutation.error,
  }
}
