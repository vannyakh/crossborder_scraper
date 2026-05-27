import { Box, Button, Grid, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import type { BatchLiveSnapshot } from '../../hooks/use-running-batches-live'
import type { RuntimeBatchInfo } from '../../lib/api'
import { useCancelBatchMutation } from '../../hooks'
import { Section } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'

function mergeBatch(
  batch: RuntimeBatchInfo,
  live?: BatchLiveSnapshot,
): RuntimeBatchInfo & { isConnected: boolean } {
  const status = live?.status
  if (!status) {
    return { ...batch, isConnected: live?.isConnected ?? false }
  }
  return {
    batch_id: batch.batch_id,
    status: status.status,
    completed: status.completed,
    total: status.total,
    success: status.success,
    failed: status.failed,
    running: status.running,
    isConnected: live?.isConnected ?? false,
  }
}

export function LiveBatchesPanel({
  batches,
  liveByBatch,
}: {
  batches: RuntimeBatchInfo[]
  liveByBatch: Record<string, BatchLiveSnapshot>
}) {
  const cancelMutation = useCancelBatchMutation()

  return (
    <Section
      title="Active batches"
      description="Real-time progress via WebSocket"
      action={
        <Text asChild fontSize="xs" color="brand.emphasis" whiteSpace="nowrap">
          <Link to="/workflow/batches">Manage batches →</Link>
        </Text>
      }
    >
      {batches.length === 0 ? (
        <Text fontSize="sm" color="fg.muted" py={2}>
          No batches running. Start one from Workflow → Batches.
        </Text>
      ) : (
        <Grid gap={3}>
          {batches.map((raw) => {
            const b = mergeBatch(raw, liveByBatch[raw.batch_id])
            const pct = b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0
            return (
              <Box
                key={b.batch_id}
                p={3}
                borderWidth="1px"
                borderColor="border.subtle"
                borderRadius="var(--radius-card)"
                bg="bg.elevated"
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                    <StatusBadge
                      status={b.running ? 'running' : 'neutral'}
                      label={b.batch_id.slice(0, 8)}
                    />
                    {b.isConnected ? (
                      <Text fontSize="xs" color="green.500">
                        live
                      </Text>
                    ) : (
                      <Text fontSize="xs" color="fg.muted">
                        connecting…
                      </Text>
                    )}
                  </Box>
                  <Text fontSize="xs" color="fg.muted">
                    {b.success}/{b.total} OK · {pct}%
                  </Text>
                </Box>
                <Box
                  mt={2}
                  h="6px"
                  borderRadius="full"
                  bg="bg.panelHover"
                  overflow="hidden"
                >
                  <Box
                    h="full"
                    w={`${pct}%`}
                    bg="accent"
                    transition="width 0.25s ease"
                  />
                </Box>
                {b.running ? (
                  <Button
                    mt={2}
                    size="xs"
                    variant="outline"
                    colorPalette="red"
                    borderRadius="input"
                    loading={cancelMutation.isPending}
                    onClick={() => void cancelMutation.mutateAsync(b.batch_id)}
                  >
                    Cancel batch
                  </Button>
                ) : null}
              </Box>
            )
          })}
        </Grid>
      )}
    </Section>
  )
}
