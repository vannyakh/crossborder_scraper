import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LoginRequestError,
  fetchAuthStatus,
  loginRequest,
  type LoginPayload,
} from '../lib/api/auth'
import { useAuthStore } from '../stores/auth-store'

export function useAuthStatusQuery() {
  return useQuery({
    queryKey: ['auth', 'status'],
    queryFn: fetchAuthStatus,
    staleTime: 30_000,
  })
}

export function useAuth() {
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const username = useAuthStore((s) => s.username)
  const login = useAuthStore((s) => s.login)
  const logoutStore = useAuthStore((s) => s.logout)

  const logout = () => {
    logoutStore()
    queryClient.clear()
  }

  const connectMutation = useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const resp = await loginRequest(payload)
      login({ username: resp.username, password: payload.password })
    },
  })

  return {
    isAuthenticated,
    username,
    logout,
    connect: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    connectError: connectMutation.error,
    isLoginCaptchaError: (err: unknown) => err instanceof LoginRequestError,
  }
}
