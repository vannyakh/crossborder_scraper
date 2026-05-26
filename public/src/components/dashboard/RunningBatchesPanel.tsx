import { Box, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import type { RuntimeBatchInfo } from '../../lib/api'
import { Section } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'

export function RunningBatchesPanel({ batches }: { batches: RuntimeBatchInfo[] }) {
  if (!batches.length) return null

  return (
    <Section
      title="Active jobs"
      description="Live batch progress"
      action={
        <Text asChild fontSize="xs" color="brand.emphasis" whiteSpace="nowrap">
          <Link to="/batches">View all →</Link>
        </Text>
      }
    >
      {batches.map((b) => {
        const pct = b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0
        return (
          <Box
            key={b.batch_id}
            py={2}
            borderTopWidth="1px"
            borderColor="border.subtle"
            _first={{ borderTopWidth: 0, pt: 0 }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
              <StatusBadge status="running" label={b.batch_id.slice(0, 8)} />
              <Text fontSize="xs" color="fg.muted">
                {b.success}/{b.total} OK · {pct}%
              </Text>
            </Box>
            <Box
              mt={1.5}
              h="4px"
              borderRadius="full"
              bg="bg.panelHover"
              overflow="hidden"
            >
              <Box
                h="full"
                w={`${pct}%`}
                bg="accent"
                transition="width 0.3s ease"
              />
            </Box>
          </Box>
        )
      })}
    </Section>
  )
}
