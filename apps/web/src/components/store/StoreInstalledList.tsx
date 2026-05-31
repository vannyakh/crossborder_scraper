import { Box, Button, HStack, SimpleGrid, Table, Text, VStack } from '@chakra-ui/react'
import { Settings } from 'lucide-react'
import type { StoreInstalled } from '../../lib/api'
import { DataList, DataListEmpty } from '../ui/DataList'
import { Panel, PanelBody } from '../ui/Panel'
import { ListCardRowsSkeleton } from '../ui/PanelSkeleton'
import { StatusBadge } from '../ui/StatusBadge'
import { STORE_CATEGORY_LABEL, pluginIcon, statusTone, type StoreViewMode } from './store-utils'

function InstalledActions({ onSettings }: { onSettings: () => void }) {
  return (
    <Button
      size="sm"
      variant="outline"
      borderColor="border.subtle"
      borderRadius="input"
      onClick={onSettings}
    >
      <Settings size={14} />
      Settings
    </Button>
  )
}

function InstalledGridCard({
  row,
  onSettings,
}: {
  row: StoreInstalled
  onSettings: (id: string) => void
}) {
  const Icon = pluginIcon(row.plugin_id)
  const host = String(row.config.host ?? '127.0.0.1')
  const port = row.config.port
  const endpoint = port ? `${host}:${port}` : host

  return (
    <Panel h="full">
      <PanelBody>
        <HStack justify="space-between" align="start" gap={2} mb={2}>
          <HStack gap={2} minW={0}>
            <Box p={1.5} borderRadius="var(--radius-card)" bg="bg.panelHover" color="fg.muted">
              <Icon size={18} />
            </Box>
            <Box minW={0}>
              <Text fontWeight="semibold" lineClamp={1}>
                {row.name}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {STORE_CATEGORY_LABEL[row.category] ?? row.category} · {row.mode ?? '—'}
              </Text>
            </Box>
          </HStack>
          <StatusBadge status={statusTone(row.status)} label={row.status} />
        </HStack>
        <Text fontFamily="mono" fontSize="xs" color="fg.muted" lineClamp={1} title={endpoint}>
          {endpoint}
          {row.config.password_set ? ' · auth' : ''}
        </Text>
        {row.probe?.message ? (
          <Text mt={1} fontSize="xs" color="fg.subtle" lineClamp={1} title={row.probe.message}>
            {row.probe.message}
          </Text>
        ) : null}
        <Box mt={3}>
          <InstalledActions onSettings={() => onSettings(row.plugin_id)} />
        </Box>
      </PanelBody>
    </Panel>
  )
}

export function StoreInstalledList({
  items,
  viewMode,
  loading,
  onSettings,
}: {
  items: StoreInstalled[]
  viewMode: StoreViewMode
  loading: boolean
  onSettings: (id: string) => void
}) {
  if (loading) {
    return <ListCardRowsSkeleton rows={4} />
  }
  if (!items.length) {
    return (
      <DataListEmpty>
        <VStack gap={1}>
          <Text>No matching plugins.</Text>
          <Text fontSize="xs">Try another search or install from the catalog.</Text>
        </VStack>
      </DataListEmpty>
    )
  }

  if (viewMode === 'grid') {
    return (
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={3}>
        {items.map((row) => (
          <InstalledGridCard key={row.plugin_id} row={row} onSettings={onSettings} />
        ))}
      </SimpleGrid>
    )
  }

  return (
    <Panel overflow="hidden">
      <DataList>
        <Table.Header bg="bg.panelHover">
          <Table.Row>
            <Table.ColumnHeader>Service</Table.ColumnHeader>
            <Table.ColumnHeader>Mode</Table.ColumnHeader>
            <Table.ColumnHeader>Endpoint</Table.ColumnHeader>
            <Table.ColumnHeader>Health</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map((row) => {
            const host = String(row.config.host ?? '127.0.0.1')
            const port = row.config.port
            const endpoint = port ? `${host}:${port}` : host
            const Icon = pluginIcon(row.plugin_id)
            return (
              <Table.Row key={row.plugin_id} _hover={{ bg: 'bg.panelHover' }}>
                <Table.Cell>
                  <HStack gap={2}>
                    <Box p={1} borderRadius="md" bg="bg.panelHover" color="fg.muted">
                      <Icon size={16} />
                    </Box>
                    <Box>
                      <Text fontWeight="medium" fontSize="sm">
                        {row.name}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {row.plugin_id}
                      </Text>
                    </Box>
                  </HStack>
                </Table.Cell>
                <Table.Cell fontSize="sm">{row.mode ?? '—'}</Table.Cell>
                <Table.Cell fontFamily="mono" fontSize="xs" maxW="200px">
                  <Text lineClamp={1} truncate title={endpoint}>
                    {endpoint}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <StatusBadge status={statusTone(row.status)} label={row.status} />
                  {row.probe?.message ? (
                    <Text
                      fontSize="xs"
                      color="fg.muted"
                      lineClamp={1}
                      truncate
                      title={row.probe.message}
                    >
                      {row.probe.message}
                    </Text>
                  ) : null}
                </Table.Cell>
                <Table.Cell>
                  <InstalledActions onSettings={() => onSettings(row.plugin_id)} />
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </DataList>
    </Panel>
  )
}
