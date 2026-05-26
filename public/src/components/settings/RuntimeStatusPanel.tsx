import { Box, SimpleGrid, Text } from '@chakra-ui/react'
import { StatusBadge } from '../ui/StatusBadge'
import { Section, SectionCard } from '../ui/Section'
import { useRuntimeStatusQuery } from '../../hooks'

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <Box px={3} py={3} borderWidth="1px" borderColor="border.subtle" borderRadius="var(--radius-card)" bg="bg.panel">
      <Text color="fg.muted" fontSize="xs">
        {label}
      </Text>
      <Text mt={1} fontSize="lg" fontWeight="semibold">
        {value}
      </Text>
    </Box>
  )
}

export function RuntimeStatusPanel() {
  const { data, isLoading, error } = useRuntimeStatusQuery()

  return (
    <Section title="Service runtime" description="Engine and storage snapshot" mt={0}>
      <SectionCard>
        {error ? (
          <Text fontSize="sm" color="red.500">
            {String((error as Error).message || error)}
          </Text>
        ) : isLoading || !data ? (
          <Text fontSize="sm" color="fg.muted">
            Loading…
          </Text>
        ) : (
          <>
            <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} gap={3}>
              <StatCell label="Uptime" value={formatUptime(data.uptime_seconds)} />
              <StatCell label="Active tasks" value={data.active_tasks} />
              <StatCell label="Workers" value={data.engine.max_concurrent_jobs} />
              <StatCell label="Proxies" value={data.engine.proxy_count} />
              <StatCell label="Products" value={data.storage.products} />
              <StatCell label="Output files" value={data.storage.output_files} />
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={4} fontSize="xs" color="fg.muted">
              <Box>
                <Text fontWeight="medium" color="fg" mb={1}>
                  Service
                </Text>
                <Text>
                  {data.service} v{data.version}
                </Text>
                <Text>Browser: {data.engine.browser_mode}</Text>
                <Text>Headless: {data.engine.headless ? 'yes' : 'no'}</Text>
              </Box>
              <Box>
                <Text fontWeight="medium" color="fg" mb={1}>
                  Storage
                </Text>
                <Text fontFamily="mono">{data.storage.db_path}</Text>
                <Text fontFamily="mono">{data.storage.output_dir}</Text>
              </Box>
            </SimpleGrid>

            {data.running_batches.length ? (
              <Box mt={4} pt={4} borderTopWidth="1px" borderColor="border.subtle">
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
                    _first={{ borderTopWidth: 0, pt: 0 }}
                  >
                    <StatusBadge status="running" label={b.batch_id.slice(0, 8)} />
                    <Text as="span" ml={2} color="fg.muted">
                      {b.success}/{b.total} OK
                    </Text>
                  </Box>
                ))}
              </Box>
            ) : null}
          </>
        )}
      </SectionCard>
    </Section>
  )
}
