import { Box, Button, Grid, HStack, Table, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { BatchJobList } from '../batches/BatchJobList'
import { ScrapeSubmitPanel } from '../batches/ScrapeSubmitPanel'
import { RunningBatchesPanel } from '../dashboard/RunningBatchesPanel'
import { ListPagination } from '../list-page/ListPagination'
import { ListSearchBar } from '../list-page/ListSearchBar'
import { useListPageState, usePagedList } from '../list-page/list-utils'
import { DataList, DataListEmpty } from '../ui/DataList'
import { DataTableSkeleton, BatchJobsSkeleton, InlineShimmer } from '../ui/PanelSkeleton'
import { Panel, PanelBody, PanelHeader } from '../ui/Panel'
import { StatusBadge } from '../ui/StatusBadge'
import {
  useBatchesQuery,
  useCancelBatchMutation,
  useRuntimeStatusQuery,
  useSelectedBatchQuery,
} from '../../hooks'
import { useUiStore } from '../../stores/ui-store'

function statusTone(s: string): 'running' | 'success' | 'neutral' | 'danger' {
  if (s === 'running') return 'running'
  if (s === 'completed') return 'success'
  if (s === 'cancelled') return 'neutral'
  return 'danger'
}

export function WorkflowBatchesPanel() {
  const { data, isLoading, error } = useBatchesQuery()
  const runtime = useRuntimeStatusQuery()
  const selectedBatchId = useUiStore((s) => s.selectedBatchId)
  const setSelectedBatchId = useUiStore((s) => s.setSelectedBatchId)
  const selected = useSelectedBatchQuery()
  const cancelMutation = useCancelBatchMutation()
  const list = useListPageState(15)

  const items = data?.items ?? []
  const filtered = useMemo(() => {
    const q = list.search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (b) => b.batch_id.toLowerCase().includes(q) || b.status.toLowerCase().includes(q),
    )
  }, [items, list.search])

  const paged = usePagedList(filtered, list.page, list.pageSize, list.search, list.setPage)
  const running = runtime.data?.running_batches ?? []

  const liveProgress = selected.status
    ? `${selected.status.success}/${selected.status.total}`
    : selected.summary
      ? `${selected.summary.success}/${selected.summary.total}`
      : '—'

  return (
    <Box>
      {running.length ? <RunningBatchesPanel batches={running} /> : null}

      <ScrapeSubmitPanel />

      <HStack justify="flex-end" mb={3} flexWrap="wrap" gap={2}>
        <ListSearchBar
          value={list.search}
          onChange={list.setSearch}
          placeholder="Search batch ID or status…"
        />
      </HStack>

      {error ? (
        <Text fontSize="sm" color="red.500" mb={3}>
          {String((error as Error).message || error)}
        </Text>
      ) : null}

      <Grid templateColumns={{ base: '1fr', lg: selectedBatchId ? '1fr 1fr' : '1fr' }} gap={4}>
        {isLoading ? (
          <DataTableSkeleton columns={4} rows={10} />
        ) : paged.total === 0 ? (
          <DataListEmpty>No batches match your search.</DataListEmpty>
        ) : (
          <DataList>
            <Table.Header bg="bg.panelHover">
              <Table.Row>
                <Table.ColumnHeader>Batch</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Progress</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {paged.items.map((b) => {
                const rowProgress =
                  selectedBatchId === b.batch_id && selected.status
                    ? `${selected.status.success}/${selected.status.total}`
                    : `${b.success}/${b.total}`
                return (
                  <Table.Row
                    key={b.batch_id}
                    cursor="pointer"
                    bg={selectedBatchId === b.batch_id ? 'bg.navActive' : undefined}
                    _hover={{ bg: 'bg.panelHover' }}
                    onClick={() => setSelectedBatchId(b.batch_id)}
                  >
                    <Table.Cell fontFamily="mono" fontSize="sm" maxW="200px">
                      <Text lineClamp={1} truncate title={b.batch_id}>
                        {b.batch_id}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={statusTone(b.status)} label={b.status} />
                    </Table.Cell>
                    <Table.Cell fontSize="sm" color="fg.muted">
                      {rowProgress}
                    </Table.Cell>
                    <Table.Cell textAlign="right" onClick={(e) => e.stopPropagation()}>
                      {b.status === 'running' ? (
                        <Button
                          size="xs"
                          variant="outline"
                          colorPalette="red"
                          borderRadius="input"
                          onClick={() => void cancelMutation.mutateAsync(b.batch_id)}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </DataList>
        )}

        {selectedBatchId ? (
          <Panel>
            <PanelHeader
              title={`Batch ${selectedBatchId}`}
              description={
                selected.isRunning
                  ? selected.isConnected
                    ? 'Live stream connected'
                    : 'Connecting…'
                  : 'Completed batch'
              }
            />
            <PanelBody p={0}>
              <Box px={4} py={3} borderBottomWidth="1px" borderColor="border.subtle">
                {selected.isLoading ? (
                  <HStack gap={2}>
                    <InlineShimmer w="56px" h="20px" radius="full" />
                    <InlineShimmer w="72px" h="12px" />
                  </HStack>
                ) : (
                  <HStack gap={2} fontSize="sm">
                    <StatusBadge
                      status={statusTone(
                        selected.status?.status ?? selected.summary?.status ?? 'neutral',
                      )}
                      label={selected.status?.status ?? selected.summary?.status ?? 'unknown'}
                    />
                    <Text color="fg.muted">{liveProgress}</Text>
                  </HStack>
                )}
              </Box>
              {selected.isLoading ? (
                <BatchJobsSkeleton rows={6} />
              ) : (
                <BatchJobList
                  results={selected.results}
                  maxH="400px"
                  emptyLabel={
                    selected.isRunning ? 'Waiting for job results…' : 'No job results recorded.'
                  }
                />
              )}
            </PanelBody>
          </Panel>
        ) : null}
      </Grid>

      <ListPagination
        page={paged.page}
        totalPages={paged.totalPages}
        total={paged.total}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
      />
    </Box>
  )
}
