import { Box, Button, HStack, Table, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { DataList, DataListEmpty } from '../ui/DataList'
import { useDeleteFileMutation, useFilesQuery } from '../../hooks'
import { formatBytes } from '../../lib/utils'
import type { FileEntry } from '../../lib/api'
import { InventorySearchBar } from './InventorySearchBar'
import { useInventoryListState, useInventoryPagedList } from './inventory-list-utils'
import { InventoryPagination } from './InventoryPagination'

function searchFiles(items: FileEntry[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((f) =>
    [f.path, f.name, f.kind].join(' ').toLowerCase().includes(q),
  )
}

export function InventoryFilesSection() {
  const { data, isLoading, error } = useFilesQuery()
  const deleteMutation = useDeleteFileMutation()
  const list = useInventoryListState(20)

  const items = data?.items ?? []
  const filtered = useMemo(() => searchFiles(items, list.search), [items, list.search])
  const paged = useInventoryPagedList(filtered, list)

  async function remove(path: string) {
    if (!confirm(`Delete ${path}?`)) return
    await deleteMutation.mutateAsync(path)
  }

  return (
    <Box>
      <HStack justify="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Text fontSize="sm" color="fg.muted" fontFamily="mono" lineClamp={1} title={data?.output_dir}>
          {data?.output_dir ?? 'data/output'}
        </Text>
        <InventorySearchBar
          value={list.search}
          onChange={list.setSearch}
          placeholder="Search file name or path…"
        />
      </HStack>

      {error ? (
        <Text fontSize="sm" color="red.500" mb={3}>
          {String((error as Error).message || error)}
        </Text>
      ) : null}

      {isLoading ? (
        <DataListEmpty>Loading files…</DataListEmpty>
      ) : paged.total === 0 ? (
        <DataListEmpty>No files match your search.</DataListEmpty>
      ) : (
        <DataList>
          <Table.Header bg="bg.panelHover">
            <Table.Row>
              <Table.ColumnHeader>Name</Table.ColumnHeader>
              <Table.ColumnHeader>Size</Table.ColumnHeader>
              <Table.ColumnHeader>Modified</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {paged.items.map((f) => (
              <Table.Row key={f.path} _hover={{ bg: 'bg.panelHover' }}>
                <Table.Cell fontFamily="mono" fontSize="sm" maxW="280px">
                  <Text lineClamp={1} truncate title={f.path}>
                    {f.name || f.path}
                  </Text>
                  <Text fontSize="xs" color="fg.subtle" lineClamp={1} truncate>
                    {f.path}
                  </Text>
                </Table.Cell>
                <Table.Cell fontSize="sm" color="fg.muted">
                  {formatBytes(f.size_bytes)}
                </Table.Cell>
                <Table.Cell fontSize="sm" color="fg.muted" whiteSpace="nowrap">
                  {new Date(f.modified_at).toLocaleString()}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <HStack gap={1} justify="flex-end">
                    <Button
                      asChild
                      size="xs"
                      variant="outline"
                      borderColor="border.subtle"
                      borderRadius="input"
                    >
                      <a
                        href={`/files/${encodeURIComponent(f.path)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download
                      </a>
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      colorPalette="red"
                      borderRadius="input"
                      onClick={() => void remove(f.path)}
                    >
                      Delete
                    </Button>
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </DataList>
      )}

      <InventoryPagination
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
