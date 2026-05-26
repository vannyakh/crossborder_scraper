import { Box, SimpleGrid, Text } from '@chakra-ui/react'
import { Panel, PanelBody, PanelHeader } from '../ui/Panel'
import { StatusBadge } from '../ui/StatusBadge'
import { useRuntimeStatusQuery } from '../../hooks'

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function RuntimeStatusPanel() {
  const { data, isLoading, error } = useRuntimeStatusQuery()

  return (
    <Panel>
      <PanelHeader title="Service runtime" description="Engine and storage ops snapshot" />
      <PanelBody>
        {error ? (
          <Text fontSize="sm" color="red.500">
            {String((error as Error).message || error)}
          </Text>
        ) : isLoading || !data ? (
          <Text fontSize="sm" color="fg.muted">
            Loading…
          </Text>
        ) : (
          <SimpleGrid columns={2} gap={3} fontSize="sm">
            <Box>
              <Text color="fg.muted" fontSize="xs">
                Uptime
              </Text>
              <Text>{formatUptime(data.uptime_seconds)}</Text>
            </Box>
            <Box>
              <Text color="fg.muted" fontSize="xs">
                Active tasks
              </Text>
              <Text>{data.active_tasks}</Text>
            </Box>
            <Box>
              <Text color="fg.muted" fontSize="xs">
                Workers
              </Text>
              <Text>{data.engine.max_concurrent_jobs}</Text>
            </Box>
            <Box>
              <Text color="fg.muted" fontSize="xs">
                Proxies
              </Text>
              <Text>{data.engine.proxy_count}</Text>
            </Box>
            <Box>
              <Text color="fg.muted" fontSize="xs">
                Products
              </Text>
              <Text>{data.storage.products}</Text>
            </Box>
            <Box>
              <Text color="fg.muted" fontSize="xs">
                Output files
              </Text>
              <Text>{data.storage.output_files}</Text>
            </Box>
          </SimpleGrid>
        )}

        {data?.running_batches.length ? (
          <Box mt={4}>
            <Text fontSize="xs" color="fg.muted" mb={2}>
              Running batches
            </Text>
            {data.running_batches.map((b) => (
              <Box
                key={b.batch_id}
                py={1.5}
                borderTopWidth="1px"
                borderColor="border.subtle"
                fontSize="xs"
              >
                <StatusBadge status="running" label={b.batch_id} />
                <Text as="span" ml={2} color="fg.muted">
                  {b.success}/{b.total}
                </Text>
              </Box>
            ))}
          </Box>
        ) : null}
      </PanelBody>
    </Panel>
  )
}
