import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AuthState = {
  isAuthenticated: boolean
  username: string | null
  password: string | null
  login: (payload: { username: string; password: string }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      username: null,
      password: null,
      login: ({ username, password }) =>
        set({
          isAuthenticated: true,
          username: username.trim(),
          password,
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          username: null,
          password: null,
        }),
    }),
    { name: 'crossborder-auth' },
  ),
)

export function getBasicAuthHeader(): Record<string, string> {
  const { username, password, isAuthenticated } = useAuthStore.getState()
  if (!isAuthenticated || !username || !password) return {}
  const encoded = btoa(`${username}:${password}`)
  return { Authorization: `Basic ${encoded}` }
}
