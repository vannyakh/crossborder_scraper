import { Box, Button, HStack, Link, Table, Text } from '@chakra-ui/react'
import { useEffect, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ListPagination } from '../list-page/ListPagination'
import { ListSearchBar } from '../list-page/ListSearchBar'
import { useListPageState, usePagedList } from '../list-page/list-utils'
import { DataList, DataListEmpty } from '../ui/DataList'
import { useDeleteProductMutation, useProductsQuery } from '../../hooks'
import type { ProductSummary } from '../../lib/api'
import { artifactProductPath } from './artifact-sections'

const SEARCH_FETCH_LIMIT = 500

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

export function ArtifactProductsPanel() {
  const list = useListPageState(20)
  const searchActive = list.search.trim().length > 0
  const serverOffset = searchActive ? 0 : (list.page - 1) * list.pageSize
  const fetchLimit = searchActive ? SEARCH_FETCH_LIMIT : list.pageSize

  const { data, isLoading, error } = useProductsQuery(fetchLimit, serverOffset)
  const deleteMutation = useDeleteProductMutation()

  useEffect(() => {
    list.setPage(1)
  }, [list.search, list.setPage])

  const items = data?.items ?? []
  const filtered = useMemo(() => searchProducts(items, list.search), [items, list.search])
  const clientPaged = usePagedList(filtered, list)
  const catalogTotal = data?.total ?? 0
  const displayItems = searchActive ? clientPaged.items : items
  const displayTotal = searchActive ? clientPaged.total : catalogTotal
  const displayPage = searchActive ? clientPaged.page : list.page
  const displayTotalPages = searchActive
    ? clientPaged.totalPages
    : Math.max(1, Math.ceil(catalogTotal / list.pageSize))

  async function remove(id: number) {
    if (!confirm('Delete this product?')) return
    await deleteMutation.mutateAsync(id)
  }

  return (
    <Box>
      <HStack justify="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Text fontSize="sm" color="fg.muted" lineClamp={1}>
          {catalogTotal} items in catalog
          {searchActive ? ' · search loads up to 500 rows' : ''}
        </Text>
        <ListSearchBar
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
      ) : displayTotal === 0 ? (
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
            {displayItems.map((p) => (
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
                      <RouterLink to={artifactProductPath(p.id)}>
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

      <ListPagination
        page={displayPage}
        totalPages={displayTotalPages}
        total={displayTotal}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
      />
    </Box>
  )
}
