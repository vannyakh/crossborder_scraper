import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AuthState = {
  isAuthenticated: boolean
  accessToken: string | null
  operatorName: string
  login: (payload: { token?: string; name?: string }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      accessToken: null,
      operatorName: 'Operator',
      login: ({ token, name }) =>
        set({
          isAuthenticated: true,
          accessToken: token?.trim() || null,
          operatorName: name?.trim() || 'Operator',
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          accessToken: null,
        }),
    }),
    { name: 'crossborder-auth' },
  ),
)
