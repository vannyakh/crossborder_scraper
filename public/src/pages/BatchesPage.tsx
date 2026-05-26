import { Box, Button, Grid, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { motion } from 'motion/react'
import { Link as RouterLink } from 'react-router-dom'
import { FadeIn } from '../components/motion/FadeIn'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel, PanelBody, PanelHeader } from '../components/ui/Panel'
import { StatusBadge } from '../components/ui/StatusBadge'
import {
  useBatchesQuery,
  useCancelBatchMutation,
  useSelectedBatchQuery,
} from '../hooks'
import { useUiStore } from '../stores/ui-store'

const MotionBox = motion.create(Box)

function statusTone(s: string): 'running' | 'success' | 'neutral' | 'danger' {
  if (s === 'running') return 'running'
  if (s === 'completed') return 'success'
  if (s === 'cancelled') return 'neutral'
  return 'danger'
}

export function BatchesPage() {
  const { data, isLoading, error, refetch } = useBatchesQuery()
  const selectedBatchId = useUiStore((s) => s.selectedBatchId)
  const setSelectedBatchId = useUiStore((s) => s.setSelectedBatchId)
  const { data: selected } = useSelectedBatchQuery()
  const cancelMutation = useCancelBatchMutation()

  const items = data?.items ?? []
  const err = error ? String((error as Error).message || error) : ''

  return (
    <VStack align="stretch" gap={5}>
      <PageHeader
        title="Batches"
        description="Server-persisted scrape runs and per-job outcomes."
        action={
          <Button
            variant="outline"
            borderColor="border.subtle"
            size="sm"
            loading={isLoading}
            onClick={() => void refetch()}
          >
            Refresh
          </Button>
        }
      />

      {err ? (
        <Text fontSize="sm" color="red.400">
          {err}
        </Text>
      ) : null}

      <Grid templateColumns={{ base: '1fr', lg: selectedBatchId ? '1fr 1fr' : '1fr' }} gap={4}>
        <FadeIn>
          <Panel>
            <PanelHeader title="History" description="Click a batch to inspect results." />
            <PanelBody>
              <VStack align="stretch" gap={2}>
                {items.map((b, i) => (
                  <MotionBox
                    key={b.batch_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    p={3}
                    borderRadius="card"
                    borderWidth="1px"
                    borderColor={selectedBatchId === b.batch_id ? 'brand.emphasis' : 'border.subtle'}
                    bg="bg.elevated"
                  >
                    <HStack justify="space-between" align="flex-start" gap={2}>
                      <Box
                        as="button"
                        textAlign="left"
                        flex={1}
                        onClick={() => setSelectedBatchId(b.batch_id)}
                        cursor="pointer"
                      >
                        <HStack gap={2}>
                          <Text fontFamily="mono" fontSize="sm">
                            {b.batch_id}
                          </Text>
                          <StatusBadge status={statusTone(b.status)} label={b.status} />
                        </HStack>
                        <Text mt={1} fontSize="xs" color="fg.muted">
                          {b.success}/{b.total} ok · {new Date(b.started_at).toLocaleString()}
                        </Text>
                      </Box>
                      {b.status === 'running' ? (
                        <Button
                          size="xs"
                          variant="outline"
                          colorPalette="red"
                          loading={cancelMutation.isPending}
                          onClick={() => void cancelMutation.mutateAsync(b.batch_id)}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </HStack>
                  </MotionBox>
                ))}
                {items.length === 0 && !isLoading ? (
                  <Text fontSize="sm" color="fg.muted">
                    No batches yet.
                  </Text>
                ) : null}
              </VStack>
            </PanelBody>
          </Panel>
        </FadeIn>

        {selectedBatchId && selected ? (
          <FadeIn delay={0.08}>
            <Panel>
              <PanelHeader
                title={`Batch ${selected.batch_id}`}
                action={
                  <Link asChild fontSize="sm" color="brand.emphasis">
                    <RouterLink to="/">Submit jobs →</RouterLink>
                  </Link>
                }
              />
              <PanelBody maxH="65vh" overflowY="auto">
                <VStack align="stretch" gap={2}>
                  {(selected.results || []).map((r) => (
                    <Box
                      key={r.job_id}
                      p={2}
                      borderRadius="input"
                      borderWidth="1px"
                      borderColor="border.subtle"
                      fontSize="xs"
                    >
                      <StatusBadge
                        status={r.status === 'success' ? 'success' : 'danger'}
                        label={r.status}
                      />
                      <Text mt={1} wordBreak="break-all" color="fg.muted">
                        {r.url}
                      </Text>
                      {r.product?.title ? (
                        <Text mt={1} color="fg.subtle">
                          {r.product.title}
                        </Text>
                      ) : null}
                    </Box>
                  ))}
                </VStack>
              </PanelBody>
            </Panel>
          </FadeIn>
        ) : null}
      </Grid>
    </VStack>
  )
}
