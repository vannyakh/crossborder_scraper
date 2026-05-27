import { Box, HStack, Text } from '@chakra-ui/react'
import { StatusBadge } from '../ui/StatusBadge'
import type { JobResult } from '../../lib/api'

export function BatchJobList({
  results,
  maxH = '320px',
  emptyLabel = 'No job results yet.',
}: {
  results: JobResult[]
  maxH?: string
  emptyLabel?: string
}) {
  if (results.length === 0) {
    return (
      <Box px={4} py={6} fontSize="sm" color="fg.muted">
        {emptyLabel}
      </Box>
    )
  }

  return (
    <Box maxH={maxH} overflowY="auto">
      {results.map((r) => (
        <HStack
          key={`${r.job_id}-${r.url}`}
          px={4}
          py={2}
          borderBottomWidth="1px"
          borderColor="border.subtle"
          fontSize="sm"
          align="flex-start"
          _last={{ borderBottomWidth: 0 }}
        >
          <StatusBadge
            status={r.status === 'success' ? 'success' : r.status === 'running' ? 'running' : 'danger'}
            label={r.status}
          />
          <Box flex={1} minW={0}>
            <Text truncate title={r.url}>
              {r.url}
            </Text>
            {r.error ? (
              <Text fontSize="xs" color="red.400" mt={0.5} lineClamp={2}>
                {r.error}
              </Text>
            ) : null}
            {r.product?.title ? (
              <Text fontSize="xs" color="fg.muted" mt={0.5} truncate>
                {r.product.title}
              </Text>
            ) : null}
          </Box>
          <Text fontSize="xs" color="fg.muted" fontFamily="mono" whiteSpace="nowrap">
            {r.ai_used ? 'AI · ' : ''}
            {r.duration_seconds ?? 0}s
          </Text>
        </HStack>
      ))}
    </Box>
  )
}
