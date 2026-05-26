import { Box, HStack, SimpleGrid, Text } from '@chakra-ui/react'
import { FolderOpen, Layers, Package } from 'lucide-react'
import { Panel, PanelBody } from '../ui/Panel'
import { useStatsQuery } from '../../hooks'

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Package
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <Box minW={0}>
      <HStack gap={1.5} mb={1} color="fg.muted">
        <Icon size={14} strokeWidth={2} />
        <Text fontSize="xs" fontWeight="medium">
          {label}
        </Text>
      </HStack>
      <Text fontSize="xl" fontWeight="semibold" lineHeight="short">
        {value}
      </Text>
      {hint ? (
        <Text fontSize="xs" color="fg.subtle" lineClamp={1} truncate title={hint}>
          {hint}
        </Text>
      ) : null}
    </Box>
  )
}

export function InventoryOverviewBar() {
  const stats = useStatsQuery()
  const s = stats.data

  return (
    <Panel mb={4}>
      <PanelBody py={3}>
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
          <StatTile
            icon={Layers}
            label="Running batches"
            value={s?.running_batches ?? '—'}
            hint={s?.running_batches ? 'Active scrape jobs' : 'No jobs running'}
          />
          <StatTile icon={Package} label="Products" value={s?.products ?? '—'} hint="SQLite catalog" />
          <StatTile icon={FolderOpen} label="Output files" value={s?.output_files ?? '—'} hint="On disk" />
          <StatTile
            icon={Layers}
            label="Batch history"
            value={s?.batches ?? '—'}
            hint="Total batch records"
          />
        </SimpleGrid>
      </PanelBody>
    </Panel>
  )
}
