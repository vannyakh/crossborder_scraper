import { Button, HStack, Link, Table, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { Toolbar } from '../components/layout/Toolbar'
import { DataList, DataListEmpty } from '../components/ui/DataList'
import { useDeleteProductMutation, useProductsQuery } from '../hooks'

export function ProductsPage() {
  const { data, isLoading, error, refetch } = useProductsQuery()
  const deleteMutation = useDeleteProductMutation()

  const items = data?.items ?? []
  const total = data?.total ?? 0

  async function remove(id: number) {
    if (!confirm('Delete this product?')) return
    await deleteMutation.mutateAsync(id)
  }

  return (
    <>
      <Toolbar
        title="Products"
        description={`${total} items in database`}
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

      {isLoading ? (
        <DataListEmpty>Loading…</DataListEmpty>
      ) : items.length === 0 ? (
        <DataListEmpty>No products yet.</DataListEmpty>
      ) : (
        <DataList>
          <Table.Header bg="bg.panelHover">
            <Table.Row>
              <Table.ColumnHeader>Title</Table.ColumnHeader>
              <Table.ColumnHeader>Source</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((p) => (
              <Table.Row key={p.id} _hover={{ bg: 'bg.panelHover' }}>
                <Table.Cell maxW="280px">
                  <Text fontWeight="medium" truncate title={p.title}>
                    {p.title}
                  </Text>
                  <Text fontSize="xs" color="fg.muted" truncate title={p.source_url}>
                    {p.source_url}
                  </Text>
                </Table.Cell>
                <Table.Cell fontSize="sm" color="fg.muted">
                  {p.source}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <HStack gap={1} justify="flex-end">
                    <Link asChild>
                      <RouterLink to={`/products/${p.id}`}>
                        <Button size="xs" variant="ghost" colorPalette="blue">
                          Open
                        </Button>
                      </RouterLink>
                    </Link>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
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
    </>
  )
}
