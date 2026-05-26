import { Box, Button, Grid, HStack, Table, Text } from '@chakra-ui/react'
import { Toolbar } from '../components/layout/Toolbar'
import { DataList, DataListEmpty } from '../components/ui/DataList'
import { Panel, PanelBody, PanelHeader } from '../components/ui/Panel'
import { StatusBadge } from '../components/ui/StatusBadge'
import {
  useBatchesQuery,
  useCancelBatchMutation,
  useSelectedBatchQuery,
} from '../hooks'
import { useUiStore } from '../stores/ui-store'

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

  return (
    <>
      <Toolbar
        title="Batches"
        description="Scrape run history"
        actions={
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            colorPalette="blue"
            loading={isLoading}
            onClick={() => void refetch()}
          >
            Refresh
          </Button>
        }
      />

      {error ? (
        <Text fontSize="sm" color="red.500" mb={3}>
          {String((error as Error).message || error)}
        </Text>
      ) : null}

      <Grid templateColumns={{ base: '1fr', lg: selectedBatchId ? '1fr 1fr' : '1fr' }} gap={4}>
        {items.length === 0 && !isLoading ? (
          <DataListEmpty>No batches yet.</DataListEmpty>
        ) : (
          <DataList>
            <Table.Header bg="bg.panelHover">
              <Table.Row>
                <Table.ColumnHeader>ID</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Progress</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {items.map((b) => (
                <Table.Row
                  key={b.batch_id}
                  cursor="pointer"
                  bg={selectedBatchId === b.batch_id ? 'bg.navActive' : undefined}
                  _hover={{ bg: 'bg.panelHover' }}
                  onClick={() => setSelectedBatchId(b.batch_id)}
                >
                  <Table.Cell fontFamily="mono" fontSize="sm">
                    {b.batch_id}
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={statusTone(b.status)} label={b.status} />
                  </Table.Cell>
                  <Table.Cell fontSize="sm" color="fg.muted">
                    {b.success}/{b.total}
                  </Table.Cell>
                  <Table.Cell textAlign="right" onClick={(e) => e.stopPropagation()}>
                    {b.status === 'running' ? (
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => void cancelMutation.mutateAsync(b.batch_id)}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </DataList>
        )}

        {selectedBatchId && selected ? (
          <Panel>
            <PanelHeader title={`Batch ${selected.batch_id}`} />
            <PanelBody p={0} maxH="400px" overflowY="auto">
              {(selected.results || []).map((r) => (
                <Box
                  key={r.job_id}
                  px={3}
                  py={2}
                  borderBottomWidth="1px"
                  borderColor="border.subtle"
                  fontSize="xs"
                >
                  <HStack gap={2}>
                    <StatusBadge
                      status={r.status === 'success' ? 'success' : 'danger'}
                      label={r.status}
                    />
                    <Text truncate flex={1} title={r.url}>
                      {r.url}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </PanelBody>
          </Panel>
        ) : null}
      </Grid>
    </>
  )
}
