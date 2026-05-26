import { Spinner, VStack, Text } from '@chakra-ui/react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useHealthQuery } from '../../hooks/queries/use-health-query'
import { useAuthStore } from '../../stores/auth-store'

export function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  const healthQuery = useHealthQuery()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (healthQuery.isLoading) {
    return (
      <VStack minH="100dvh" justify="center" className="app-mesh" color="fg">
        <Spinner color="purple.400" size="lg" />
        <Text fontSize="sm" color="fg.muted">
          Verifying API connection…
        </Text>
      </VStack>
    )
  }

  if (healthQuery.isError) {
    return <Navigate to="/login" replace state={{ from: location.pathname, apiOffline: true }} />
  }

  return <Outlet />
}
