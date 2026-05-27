import {
  Box,
  Button,
  HStack,
  Separator,
  Table,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ListPagination } from '../components/list-page/ListPagination'
import { ListSearchBar } from '../components/list-page/ListSearchBar'
import { Toolbar } from '../components/layout/Toolbar'
import { DataList, DataListEmpty } from '../components/ui/DataList'
import { SectionCard, SubtitleText } from '../components/ui/Section'
import { useAccentPalette } from '../hooks/use-ui-config'
import { useClearLogsMutation, useLogsQuery } from '../hooks/queries/use-logs-query'
import type { LogCategory } from '../lib/api'

const LOG_TABS: { id: LogCategory; label: string; description: string }[] = [
  {
    id: 'operation',
    label: 'Operation',
    description: 'Panel actions, settings, and user operations',
  },
  {
    id: 'run',
    label: 'Run',
    description: 'Scrape batch jobs and per-URL outcomes',
  },
  {
    id: 'cron',
    label: 'Cron',
    description: 'Scheduled agent tasks and manual executes',
  },
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

function parseLogCategory(value: string | null): LogCategory | null {
  if (value === 'cron' || value === 'run' || value === 'operation') return value
  return null
}

export function LogsPage() {
  const accentPalette = useAccentPalette()
  const [searchParams] = useSearchParams()
  const initialCategory = parseLogCategory(searchParams.get('category'))
  const initialQ = searchParams.get('q') ?? ''

  const [category, setCategory] = useState<LogCategory>(initialCategory ?? 'operation')
  const [q, setQ] = useState(initialQ)
  const [search, setSearch] = useState(initialQ)
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

  const activeTab = LOG_TABS.find((t) => t.id === category) ?? LOG_TABS[0]
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const items = data?.items ?? []

  useEffect(() => {
    const paramCategory = parseLogCategory(searchParams.get('category'))
    const paramQ = searchParams.get('q') ?? ''
    if (paramCategory) setCategory(paramCategory)
    if (paramQ) {
      setQ(paramQ)
      setSearch(paramQ)
      setPage(1)
    }
  }, [searchParams])

  function onTabChange(next: LogCategory) {
    setCategory(next)
    setPage(1)
  }

  function applySearch() {
    setSearch(q.trim())
    setPage(1)
  }

  async function onClear() {
    if (!confirm(`Clear all ${activeTab.label.toLowerCase()} logs?`)) return
    await clearMutation.mutateAsync(category)
    setPage(1)
  }

  return (
    <>
      <Toolbar
        title="Logs"
        description="Operation, scrape runs, and cron agent history"
        actions={
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              borderRadius="input"
              loading={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              borderRadius="input"
              colorPalette="red"
              loading={clearMutation.isPending}
              onClick={() => void onClear()}
            >
              <Trash2 size={14} />
              Clear
            </Button>
          </HStack>
        }
      />

      <SectionCard p={0} mb={0} overflow="hidden">
        <Box px={{ base: 3, md: 4 }} pt={{ base: 3, md: 4 }}>
          <Tabs.Root
            value={category}
            onValueChange={(e) => onTabChange(e.value as LogCategory)}
            variant="line"
            colorPalette={accentPalette}
          >
            <Tabs.List borderColor="border.subtle" gap={1}>
              {LOG_TABS.map((tab) => (
                <Tabs.Trigger key={tab.id} value={tab.id} fontSize="sm" px={3}>
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>
          <SubtitleText mt={2}>{activeTab.description}</SubtitleText>
        </Box>

        <Separator borderColor="border.subtle" />

        <HStack
          px={{ base: 3, md: 4 }}
          py={3}
          gap={3}
          flexWrap="wrap"
          justify="space-between"
          align="center"
        >
          <Box
            as="form"
            flex="1"
            minW={{ base: 'full', sm: '280px' }}
            onSubmit={(e) => {
              e.preventDefault()
              applySearch()
            }}
          >
            <ListSearchBar
              value={q}
              onChange={setQ}
              placeholder="Search user, type, or details…"
            />
          </Box>
          <Button
            size="sm"
            colorPalette={accentPalette}
            borderRadius="input"
            onClick={applySearch}
          >
            Search
          </Button>
        </HStack>

        <Separator borderColor="border.subtle" />

        {error ? (
          <Box px={{ base: 3, md: 4 }} py={3}>
            <Text fontSize="sm" color="red.500">
              {String((error as Error).message || error)}
            </Text>
          </Box>
        ) : null}

        {isLoading ? (
          <DataListEmpty>Loading…</DataListEmpty>
        ) : items.length === 0 ? (
          <DataListEmpty>No log entries in this category.</DataListEmpty>
        ) : (
          <DataList
            borderWidth={0}
            borderRadius={0}
            borderTopWidth="1px"
            maxH="min(62vh, 600px)"
          >
            <Table.Header bg="bg.panelHover" position="sticky" top={0} zIndex={1}>
              <Table.Row>
                <Table.ColumnHeader w="100px">User</Table.ColumnHeader>
                <Table.ColumnHeader w="140px">Type</Table.ColumnHeader>
                <Table.ColumnHeader>Details</Table.ColumnHeader>
                <Table.ColumnHeader w="168px" textAlign="right">
                  Time
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {items.map((row, index) => (
                <Table.Row
                  key={row.id}
                  _hover={{ bg: 'bg.panelHover' }}
                  borderBottomWidth={index < items.length - 1 ? '1px' : undefined}
                  borderColor="border.subtle"
                >
                  <Table.Cell fontSize="sm" color="fg.muted" verticalAlign="top">
                    {row.user}
                  </Table.Cell>
                  <Table.Cell fontSize="sm" fontWeight="medium" verticalAlign="top">
                    {row.operation_type}
                  </Table.Cell>
                  <Table.Cell fontSize="sm" color="fg.muted" verticalAlign="top" maxW="0">
                    <Text lineClamp={3} title={row.details} wordBreak="break-word">
                      {row.details}
                    </Text>
                  </Table.Cell>
                  <Table.Cell
                    fontSize="xs"
                    fontFamily="mono"
                    color="fg.subtle"
                    textAlign="right"
                    whiteSpace="nowrap"
                    verticalAlign="top"
                  >
                    {formatLogTime(row.created_at)}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </DataList>
        )}

        {total > 0 ? (
          <Box px={{ base: 3, md: 4 }} pb={{ base: 3, md: 4 }}>
            <ListPagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={limit}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setLimit(size)
                setPage(1)
              }}
            />
          </Box>
        ) : null}
      </SectionCard>
    </>
  )
}
