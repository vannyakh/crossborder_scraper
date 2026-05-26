import { Box, Button, HStack, Link, Table, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { DataList, DataListEmpty } from '../ui/DataList'
import { useDeleteProductMutation, useProductsQuery } from '../../hooks'
import type { ProductSummary } from '../../lib/api'
import { inventoryProductPath } from './inventory-sections'
import { InventorySearchBar } from './InventorySearchBar'
import { useInventoryListState, useInventoryPagedList } from './inventory-list-utils'
import { InventoryPagination } from './InventoryPagination'

function searchProducts(items: ProductSummary[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((p) =>
    [p.title, p.source, p.source_url, p.source_product_id, String(p.id)]
      .join(' ')
      .toLowerCase()
      .includes(q),
  )
}

export function InventoryProductsSection() {
  const { data, isLoading, error } = useProductsQuery(500)
  const deleteMutation = useDeleteProductMutation()
  const list = useInventoryListState(20)

  const items = data?.items ?? []
  const filtered = useMemo(() => searchProducts(items, list.search), [items, list.search])
  const paged = useInventoryPagedList(filtered, list)

  async function remove(id: number) {
    if (!confirm('Delete this product?')) return
    await deleteMutation.mutateAsync(id)
  }

  return (
    <Box>
      <HStack justify="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Text fontSize="sm" color="fg.muted" lineClamp={1}>
          {data?.total ?? 0} items in catalog
        </Text>
        <InventorySearchBar
          value={list.search}
          onChange={list.setSearch}
          placeholder="Search title, source, URL…"
        />
      </HStack>

      {error ? (
        <Text fontSize="sm" color="red.500" mb={3}>
          {String((error as Error).message || error)}
        </Text>
      ) : null}

      {isLoading ? (
        <DataListEmpty>Loading products…</DataListEmpty>
      ) : paged.total === 0 ? (
        <DataListEmpty>No products match your search.</DataListEmpty>
      ) : (
        <DataList>
          <Table.Header bg="bg.panelHover">
            <Table.Row>
              <Table.ColumnHeader>Product</Table.ColumnHeader>
              <Table.ColumnHeader>Source</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {paged.items.map((p) => (
              <Table.Row key={p.id} _hover={{ bg: 'bg.panelHover' }}>
                <Table.Cell maxW="320px">
                  <Text fontWeight="medium" lineClamp={1} title={p.title}>
                    {p.title}
                  </Text>
                  <Text fontSize="xs" color="fg.muted" lineClamp={1} truncate title={p.source_url}>
                    {p.source_url}
                  </Text>
                </Table.Cell>
                <Table.Cell fontSize="sm" color="fg.muted">
                  {p.source}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <HStack gap={1} justify="flex-end">
                    <Link asChild>
                      <RouterLink to={inventoryProductPath(p.id)}>
                        <Button size="xs" variant="outline" borderColor="border.subtle" borderRadius="input">
                          Open
                        </Button>
                      </RouterLink>
                    </Link>
                    <Button
                      size="xs"
                      variant="outline"
                      colorPalette="red"
                      borderRadius="input"
                      onClick={() => void remove(p.id)}
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
