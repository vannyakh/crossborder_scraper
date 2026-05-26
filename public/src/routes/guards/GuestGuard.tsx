import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth-store'

export function GuestGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
