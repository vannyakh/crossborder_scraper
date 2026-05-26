import { Box, HStack, SimpleGrid, Text } from '@chakra-ui/react'
import { Box as BoxIcon, Container, Database } from 'lucide-react'
import type { ReactNode } from 'react'
import { Panel, PanelBody } from '../ui/Panel'
import { StatusBadge } from '../ui/StatusBadge'
import type { StoreEnvironment } from '../../lib/api'

function EnvStat({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Container
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <Box minW={0}>
      <HStack gap={1.5} mb={1} color="fg.muted">
        <Icon size={14} strokeWidth={2} />
        <Text fontSize="xs" fontWeight="medium">
          {label}
        </Text>
      </HStack>
      <Text
        fontSize="sm"
        fontWeight="medium"
        lineClamp={1}
        truncate
        title={typeof value === 'string' ? value : undefined}
        fontFamily={mono ? 'mono' : undefined}
      >
        {value}
      </Text>
    </Box>
  )
}

export function StoreEnvironmentBar({
  env,
  dockerReady,
}: {
  env?: StoreEnvironment
  dockerReady: boolean
}) {
  return (
    <Panel mb={4}>
      <PanelBody py={3}>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
          <EnvStat
            icon={BoxIcon}
            label="Docker"
            value={
              <StatusBadge
                status={dockerReady ? 'success' : 'warning'}
                label={dockerReady ? 'ready' : 'unavailable'}
              />
            }
          />
          <EnvStat
            icon={Container}
            label="Store data"
            value={env?.store_dir ?? '—'}
            mono
          />
          <EnvStat
            icon={Database}
            label={env?.builtin_sqlite.label ?? 'SQLite'}
            value={env?.builtin_sqlite.path ?? '—'}
            mono
          />
          <Box minW={0}>
            <Text fontSize="xs" color="fg.muted" mb={1} fontWeight="medium">
              Hint
            </Text>
            <Text fontSize="sm" color="fg.muted" lineClamp={2}>
              {dockerReady
                ? 'One-click install writes compose files under store data.'
                : 'Install Docker or use Connect external for existing services.'}
            </Text>
          </Box>
        </SimpleGrid>
      </PanelBody>
    </Panel>
  )
}
