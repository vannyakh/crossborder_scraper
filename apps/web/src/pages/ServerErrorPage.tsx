import { Button, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageBootSkeleton } from '../components/ui/PanelSkeleton'
import { ServerErrorState } from '../components/ui/ServerErrorState'
import { ThemeSettingsButton } from '../components/theme/ThemeSettingsDrawer'
import { useHealthQuery, usePublicHealthQuery } from '../hooks/queries/use-health-query'
import { useAuthStore } from '../stores/auth-store'
import { ROUTE_PATHS } from '../routes/route-config'

export type ServerErrorPageProps = {
  error?: unknown
  onRetry?: () => void
  retrying?: boolean
  secondaryAction?: ReactNode
}

export function ServerErrorPage({
  error,
  onRetry,
  retrying,
  secondaryAction,
}: ServerErrorPageProps) {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  function handleSignOut() {
    logout()
    void navigate(ROUTE_PATHS.login, { replace: true })
  }

  const footerAction = secondaryAction ?? (
    <Button
      size="sm"
      variant="outline"
      borderColor="border.subtle"
      borderRadius="input"
      onClick={handleSignOut}
    >
      Sign out
    </Button>
  )

  return (
    <Flex minH="100dvh" align="center" justify="center" position="relative" px={4} py={10} bg="bg">
      <Flex position="absolute" top={4} right={4} zIndex={1}>
        <ThemeSettingsButton />
      </Flex>
      <ServerErrorState
        error={error}
        onRetry={onRetry}
        retrying={retrying}
        secondaryAction={footerAction}
      />
    </Flex>
  )
}

/** Full-page server error when the authenticated health check fails. */
export function AuthServerErrorPage() {
  const healthQuery = useHealthQuery()

  return (
    <ServerErrorPage
      error={healthQuery.error}
      retrying={healthQuery.isFetching}
      onRetry={() => void healthQuery.refetch()}
    />
  )
}

/** Guest route — API unreachable before sign-in (e.g. /error/server). */
export function PublicServerErrorPage() {
  const healthQuery = usePublicHealthQuery()
  const navigate = useNavigate()

  if (healthQuery.isLoading) {
    return <PageBootSkeleton />
  }

  if (healthQuery.isSuccess) {
    return <Navigate to={ROUTE_PATHS.login} replace />
  }

  return (
    <ServerErrorPage
      error={healthQuery.error}
      retrying={healthQuery.isFetching}
      onRetry={() => void healthQuery.refetch()}
      secondaryAction={
        <Button
          size="sm"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="input"
          onClick={() => void navigate(ROUTE_PATHS.login, { replace: true })}
        >
          Back to sign in
        </Button>
      }
    />
  )
}
