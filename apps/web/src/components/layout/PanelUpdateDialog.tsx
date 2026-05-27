import {
  Badge,
  Box,
  Button,
  HStack,
  Link,
  List,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import {
  useApplyPanelUpdateMutation,
  type PanelUpdateStatus,
} from '../../hooks/queries/use-panel-update-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { AgentModalPanel } from '../agent/AgentModalPanel'

type PanelUpdateDialogProps = {
  open: boolean
  onClose: () => void
  status?: PanelUpdateStatus
  statusLoading?: boolean
}

export function PanelUpdateDialog({
  open,
  onClose,
  status,
  statusLoading = false,
}: PanelUpdateDialogProps) {
  const accentPalette = useAccentPalette()
  const applyMutation = useApplyPanelUpdateMutation()
  const [restarting, setRestarting] = useState(false)

  const applying = applyMutation.isPending

  const handleApply = async () => {
    try {
      const result = await applyMutation.mutateAsync({})
      if (result.restarting) {
        setRestarting(true)
      } else {
        onClose()
      }
    } catch {
      /* shown via mutation state */
    }
  }

  return (
    <AgentModalPanel
      open={open}
      onClose={onClose}
      title={restarting ? 'Restarting panel…' : 'Update panel software'}
      maxW="480px"
    >
      {statusLoading && !status ? (
        <HStack justify="center" py={8}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="fg.muted">
            Checking for updates…
          </Text>
        </HStack>
      ) : restarting ? (
        <VStack align="stretch" gap={3} py={2}>
          <Text fontSize="sm" color="fg.muted">
            Update steps completed. The panel is restarting — reload this page in a few seconds.
          </Text>
          {applyMutation.data?.steps?.length ? (
            <Box fontSize="xs" color="fg.subtle" className="app-scroll" maxH="160px" overflow="auto">
              <List.Root gap={1}>
                {applyMutation.data.steps.map((step) => (
                  <List.Item key={step}>{step}</List.Item>
                ))}
              </List.Root>
            </Box>
          ) : null}
          <Button colorPalette={accentPalette} onClick={() => window.location.reload()}>
            Reload now
          </Button>
        </VStack>
      ) : (
        <VStack align="stretch" gap={4}>
          <HStack justify="space-between" wrap="wrap" gap={2}>
            <Box>
              <Text fontSize="xs" color="fg.muted">
                Installed
              </Text>
              <Text fontWeight="semibold">v{status?.current_version ?? '—'}</Text>
            </Box>
            <Box textAlign="right">
              <Text fontSize="xs" color="fg.muted">
                Latest
              </Text>
              <Text fontWeight="semibold" color={status?.update_available ? 'green.500' : 'fg'}>
                {status?.latest_version ? `v${status.latest_version}` : '—'}
              </Text>
            </Box>
          </HStack>

          {status?.update_available ? (
            <Badge colorPalette="green" w="fit-content">
              Update available
            </Badge>
          ) : (
            <Text fontSize="sm" color="fg.muted">
              You are on the latest published version.
            </Text>
          )}

          {status && status.git_commits_behind > 0 ? (
            <Text fontSize="xs" color="fg.subtle">
              Git: {status.git_commits_behind} commit(s) behind origin/
              {status.git_branch ?? 'main'}
            </Text>
          ) : null}

          {status?.release_notes ? (
            <Box
              fontSize="xs"
              color="fg.muted"
              whiteSpace="pre-wrap"
              maxH="120px"
              overflow="auto"
              className="app-scroll"
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="var(--radius-input)"
              p={2}
            >
              {status.release_notes}
            </Box>
          ) : null}

          {status?.release_url ? (
            <Link href={status.release_url} target="_blank" rel="noreferrer" fontSize="xs" color="fg.muted">
              View release on GitHub
            </Link>
          ) : null}

          {status?.check_error ? (
            <Text fontSize="xs" color="orange.500">
              {status.check_error}
            </Text>
          ) : null}

          <Text fontSize="xs" color="fg.subtle">
            Update runs <Text as="span" fontFamily="mono">git pull</Text>, syncs Python dependencies, updates
            Playwright, and restarts the panel. Active scrape jobs may be interrupted.
          </Text>

          {applyMutation.isError ? (
            <Text fontSize="sm" color="red.500">
              {applyMutation.error instanceof Error
                ? applyMutation.error.message
                : 'Update failed'}
            </Text>
          ) : null}

          {applyMutation.data?.warnings?.length ? (
            <Box fontSize="xs" color="orange.500">
              {applyMutation.data.warnings.join(' · ')}
            </Box>
          ) : null}

          <HStack justify="flex-end" gap={2} pt={1}>
            <Button variant="ghost" onClick={onClose} disabled={applying}>
              Cancel
            </Button>
            <Button
              colorPalette={accentPalette}
              onClick={() => void handleApply()}
              loading={applying}
              disabled={!status?.update_available && !status?.git_commits_behind}
            >
              {status?.update_available ? 'Update & restart' : 'Sync & restart'}
            </Button>
          </HStack>
        </VStack>
      )}
    </AgentModalPanel>
  )
}
