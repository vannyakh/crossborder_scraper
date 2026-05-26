import { Button, HStack, Link, Table, Text } from '@chakra-ui/react'
import { Toolbar } from '../components/layout/Toolbar'
import { DataList, DataListEmpty } from '../components/ui/DataList'
import { useDeleteFileMutation, useFilesQuery } from '../hooks'
import { formatBytes } from '../lib/utils'

export function FilesPage() {
  const { data, isLoading, error, refetch } = useFilesQuery()
  const deleteMutation = useDeleteFileMutation()

  const items = data?.items ?? []

  async function remove(path: string) {
    if (!confirm(`Delete ${path}?`)) return
    await deleteMutation.mutateAsync(path)
  }

  return (
    <>
      <Toolbar
        title="Files"
        description={data?.output_dir ?? 'data/output'}
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
        <DataListEmpty>No output files.</DataListEmpty>
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
            {items.map((f) => (
              <Table.Row key={f.path} _hover={{ bg: 'bg.panelHover' }}>
                <Table.Cell fontFamily="mono" fontSize="sm" maxW="240px">
                  <Text truncate title={f.path}>
                    {f.path}
                  </Text>
                </Table.Cell>
                <Table.Cell fontSize="sm" color="fg.muted">
                  {formatBytes(f.size_bytes)}
                </Table.Cell>
                <Table.Cell fontSize="sm" color="fg.muted">
                  {new Date(f.modified_at).toLocaleString()}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <HStack gap={1} justify="flex-end">
                    <Link href={`/files/${f.path}`} target="_blank" rel="noreferrer">
                      <Button size="xs" variant="ghost" colorPalette="blue">
                        Open
                      </Button>
                    </Link>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
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
    </>
  )
}
