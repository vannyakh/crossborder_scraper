import { Box, Text, VStack } from '@chakra-ui/react'
import type { LiveMonitorEvent } from '../../lib/monitor-events'
import { Section } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'

function eventTone(type: string): 'running' | 'success' | 'danger' | 'neutral' {
  if (type === 'job_done') return 'success'
  if (type === 'batch_complete') return 'success'
  if (type === 'batch_failed') return 'danger'
  if (type === 'batch_cancelled') return 'neutral'
  if (type === 'status') return 'running'
  return 'neutral'
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function LiveEventFeed({ events }: { events: LiveMonitorEvent[] }) {
  return (
    <Section
      title="Live event stream"
      description="WebSocket updates from running scrape batches"
    >
      <Box
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-card)"
        bg="bg.panel"
        maxH="min(420px, 50vh)"
        overflowY="auto"
      >
        {events.length === 0 ? (
          <Text px={4} py={8} fontSize="sm" color="fg.muted" textAlign="center">
            Submit a batch to see live job events here.
          </Text>
        ) : (
          <VStack align="stretch" gap={0}>
            {events.map((ev) => (
              <Box
                key={ev.id}
                px={4}
                py={2.5}
                borderTopWidth="1px"
                borderColor="border.subtle"
                _first={{ borderTopWidth: 0 }}
              >
                <Box display="flex" justifyContent="space-between" gap={2} alignItems="flex-start">
                  <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" minW={0}>
                    <StatusBadge status={eventTone(ev.type)} label={ev.type} />
                    <Text fontFamily="mono" fontSize="xs" color="fg.muted">
                      {ev.batchId.slice(0, 8)}
                    </Text>
                  </Box>
                  <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">
                    {formatTime(ev.at)}
                  </Text>
                </Box>
                <Text mt={1} fontSize="sm" color="fg" lineClamp={2}>
                  {ev.message}
                </Text>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </Section>
  )
}
