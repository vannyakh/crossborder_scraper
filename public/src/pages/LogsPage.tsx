import {
  Box,
  Button,
  HStack,
  Input,
  NativeSelect,
  Table,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Toolbar } from '../components/layout/Toolbar'
import { DataList, DataListEmpty } from '../components/ui/DataList'
import { useAccentPalette } from '../hooks/use-ui-config'
import { useClearLogsMutation, useLogsQuery } from '../hooks/queries/use-logs-query'
import type { LogCategory } from '../lib/api'

const LOG_TABS: { id: LogCategory; label: string }[] = [
  { id: 'operation', label: 'Operation logs' },
  { id: 'run', label: 'Run logs' },
  { id: 'cron', label: 'Cron logs' },
]

function formatLogTime(iso: string): string {
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch {
    return iso
  }
}

export function LogsPage() {
  const accentPalette = useAccentPalette()
  const [category, setCategory] = useState<LogCategory>('operation')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(20)
  const [page, setPage] = useState(1)

  const offset = (page - 1) * limit
  const { data, isLoading, error, refetch, isFetching } = useLogsQuery({
    category,
    q: search,
    limit,
    offset,
  })
  const clearMutation = useClearLogsMutation()

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const items = data?.items ?? []

  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, start + 4)
    for (let i = start; i <= end; i += 1) pages.push(i)
    return pages
  }, [page, totalPages])

  function onTabChange(next: LogCategory) {
    setCategory(next)
    setPage(1)
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSearch(q.trim())
    setPage(1)
  }

  async function onClear() {
    const label = LOG_TABS.find((t) => t.id === category)?.label ?? category
    if (!confirm(`Clear all ${label}?`)) return
    await clearMutation.mutateAsync(category)
    setPage(1)
  }

  return (
    <>
      <Toolbar title="Logs" description="Operation, scrape runs, and cron agent history" />

      <Tabs.Root
        value={category}
        onValueChange={(e) => onTabChange(e.value as LogCategory)}
        variant="line"
        colorPalette={accentPalette}
        mb={4}
      >
        <Tabs.List borderColor="border.subtle">
          {LOG_TABS.map((tab) => (
            <Tabs.Trigger key={tab.id} value={tab.id} fontSize="sm" px={3}>
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>

      <HStack justify="space-between" flexWrap="wrap" gap={3} mb={3}>
        <HStack gap={2}>
          <Button
            size="sm"
            colorPalette={accentPalette}
            borderRadius="var(--radius-input)"
            loading={isFetching}
            onClick={() => void refetch()}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="var(--radius-input)"
            loading={clearMutation.isPending}
            onClick={() => void onClear()}
          >
            Clear logs
          </Button>
        </HStack>

        <Box as="form" onSubmit={onSearchSubmit} maxW="280px" w="full">
          <HStack
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="var(--radius-input)"
            px={2}
            bg="bg.panel"
          >
            <Search size={14} strokeWidth={2} color="var(--chakra-colors-fg-muted)" />
            <Input
              size="sm"
              variant="flushed"
              border="none"
              placeholder="Search logs…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </HStack>
        </Box>
      </HStack>

      {error ? (
        <Text fontSize="sm" color="red.500" mb={3}>
          {String((error as Error).message || error)}
        </Text>
      ) : null}

      {isLoading ? (
        <DataListEmpty>Loading…</DataListEmpty>
      ) : items.length === 0 ? (
        <DataListEmpty>No log entries.</DataListEmpty>
      ) : (
        <DataList>
          <Table.Header bg="bg.panelHover" position="sticky" top={0} zIndex={1}>
            <Table.Row>
              <Table.ColumnHeader w="120px">User</Table.ColumnHeader>
              <Table.ColumnHeader w="160px">Operation type</Table.ColumnHeader>
              <Table.ColumnHeader>Details</Table.ColumnHeader>
              <Table.ColumnHeader w="180px" textAlign="right">
                Operating time
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((row) => (
              <Table.Row key={row.id} _hover={{ bg: 'bg.panelHover' }}>
                <Table.Cell fontSize="sm" color="fg.muted">
                  {row.user}
                </Table.Cell>
                <Table.Cell fontSize="sm">{row.operation_type}</Table.Cell>
                <Table.Cell fontSize="sm" color="fg.muted" maxW="480px">
                  <Text lineClamp={2} title={row.details}>
                    {row.details}
                  </Text>
                </Table.Cell>
                <Table.Cell fontSize="sm" color="fg.muted" textAlign="right" whiteSpace="nowrap">
                  {formatLogTime(row.created_at)}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </DataList>
      )}

      <HStack justify="flex-end" mt={4} gap={2} flexWrap="wrap" fontSize="sm">
        <Button
          size="xs"
          variant="outline"
          borderColor="border.subtle"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ‹
        </Button>
        {pageNumbers.map((n) => (
          <Button
            key={n}
            size="xs"
            variant={n === page ? 'solid' : 'outline'}
            colorPalette={n === page ? accentPalette : undefined}
            borderColor="border.subtle"
            onClick={() => setPage(n)}
          >
            {n}
          </Button>
        ))}
        <Button
          size="xs"
          variant="outline"
          borderColor="border.subtle"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          ›
        </Button>
        <NativeSelect.Root size="xs" w="auto">
          <NativeSelect.Field
            value={String(limit)}
            onChange={(e) => {
              setLimit(Number(e.target.value))
              setPage(1)
            }}
            borderRadius="var(--radius-input)"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
        <Text color="fg.muted" fontSize="xs">
          Total {total}
        </Text>
      </HStack>
    </>
  )
}
