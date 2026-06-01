import {
  Box,
  Button,
  Grid,
  HStack,
  IconButton,
  Input,
  Table,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ChevronRight, Plus, RefreshCw, Search, Table2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  useDatabaseColumnsQuery,
  useDatabaseQueryMutation,
  useDatabaseTablesQuery,
} from '../../hooks/queries/use-database-engine-query'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type {
  DatabaseQueryResponse,
  DatabaseQuerySuggestion,
  DatabaseTableInfo,
} from '../../lib/api'
import {
  QueryLogPanel,
  QueryStatusBanner,
  QuerySuggestions,
  SyntaxHints,
  type QueryLogEntry,
} from './database-query-ui'
import { notifySuccess } from '../../lib/toast'
import { DataListEmpty } from '../ui/DataList'
import { FormFieldsSkeleton } from '../ui/PanelSkeleton'
import { SectionCard } from '../ui/Section'
import { fieldStyles } from '../ui/field-styles'
import { errorMessageFromUnknown } from './database-form-utils'
import { formatBytes } from '../../lib/utils'
import { SqlQueryBar } from './database-sql-bar'
import { AddColumnDialog, CreateTableDialog, InsertRowDialog } from './database-table-dialogs'

function formatRows(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function quoteTable(pluginId: string, name: string): string {
  const q = pluginId === 'postgresql' ? '"' : '`'
  return `${q}${name}${q}`
}

function tableSuggestions(pluginId: string, tableName: string): DatabaseQuerySuggestion[] {
  const t = quoteTable(pluginId, tableName)
  if (pluginId === 'postgresql') {
    return [
      { label: `Preview ${tableName}`, sql: `SELECT * FROM ${t} LIMIT 20` },
      {
        label: `Columns`,
        sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}' ORDER BY 1`,
      },
      { label: `Count`, sql: `SELECT COUNT(*) FROM ${t}` },
    ]
  }
  return [
    { label: `Preview ${tableName}`, sql: `SELECT * FROM ${t} LIMIT 20` },
    { label: `Describe`, sql: `DESCRIBE ${t}` },
    { label: `Count`, sql: `SELECT COUNT(*) FROM ${t}` },
  ]
}

function QueryWorkspace({
  querySql,
  busy,
  lastResponse,
  suggestions,
  syntaxHints,
  queryLog,
  lastResult,
  onSqlChange,
  onRun,
  onPickSuggestion,
  onClearLog,
  showGrid,
  pluginId,
  databaseName,
  tableName,
}: {
  querySql: string
  busy: boolean
  lastResponse: DatabaseQueryResponse | null
  suggestions: DatabaseQuerySuggestion[]
  syntaxHints: string[]
  queryLog: QueryLogEntry[]
  lastResult: DatabaseQueryResponse | null
  onSqlChange: (sql: string) => void
  onRun: () => void
  onPickSuggestion: (sql: string) => void
  onClearLog: () => void
  showGrid?: boolean
  pluginId: string
  databaseName: string
  tableName?: string | null
}) {
  const { t } = useLocale()
  return (
    <VStack align="stretch" gap={2}>
      <SqlQueryBar
        value={querySql}
        disabled={busy}
        loading={busy}
        pluginId={pluginId}
        databaseName={databaseName}
        tableName={tableName}
        onChange={onSqlChange}
        onRun={onRun}
        onApplyCompletion={onSqlChange}
      />
      <SyntaxHints hints={syntaxHints} />
      <QuerySuggestions
        items={suggestions}
        onPick={(sql) => {
          onPickSuggestion(sql)
        }}
      />
      <QueryStatusBanner result={lastResponse} />
      {showGrid && lastResult?.ok !== false && lastResult ? (
        <QueryResultGrid
          columns={lastResult.columns}
          rows={lastResult.rows}
          meta={t('db.config.queryResult', {
            count: lastResult.row_count,
            ms: lastResult.elapsed_ms ?? 0,
          })}
        />
      ) : null}
      <QueryLogPanel entries={queryLog} onClear={onClearLog} />
    </VStack>
  )
}

function QueryResultGrid({
  columns,
  rows,
  meta,
}: {
  columns: string[]
  rows: string[][]
  meta?: string
}) {
  const { t } = useLocale()
  if (!columns.length) {
    return (
      <Box py={6} textAlign="center">
        <Text fontSize="sm" color="fg.muted">
          {t('db.tools.noRows')}
        </Text>
      </Box>
    )
  }
  return (
    <Box>
      {meta ? (
        <Text fontSize="xs" color="fg.muted" mb={2}>
          {meta}
        </Text>
      ) : null}
      <Box
        overflow="auto"
        maxH="340px"
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-input)"
      >
        <Table.Root size="sm">
          <Table.Header bg="bg.panelHover" position="sticky" top={0} zIndex={1}>
            <Table.Row>
              {columns.map((col) => (
                <Table.ColumnHeader key={col} fontFamily="mono" fontSize="xs" whiteSpace="nowrap">
                  {col}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((r, idx) => (
              <Table.Row key={idx} _hover={{ bg: 'bg.panelHover' }}>
                {r.map((cell, ci) => (
                  <Table.Cell key={ci} fontFamily="mono" fontSize="xs" maxW="200px" truncate>
                    {cell === '' || cell == null ? <Text color="fg.muted">NULL</Text> : cell}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  )
}

function TableIconCard({
  table,
  active,
  onClick,
}: {
  table: DatabaseTableInfo
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width: '100%', padding: 0, border: 'none', background: 'none' }}
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap={2}
        p={3}
        minH="88px"
        w="full"
        borderWidth="1px"
        borderColor={active ? 'green.500' : 'border.subtle'}
        borderRadius="var(--radius-input)"
        bg={active ? 'green.subtle' : 'bg.elevated'}
        cursor="pointer"
        transition="border-color 0.15s, background 0.15s"
        _hover={{ borderColor: 'green.400', bg: 'bg.panelHover' }}
      >
        <Box color="blue.400">
          <Table2 size={22} strokeWidth={1.5} />
        </Box>
        <Text
          fontSize="xs"
          fontFamily="mono"
          fontWeight="medium"
          textAlign="center"
          lineClamp={2}
          wordBreak="break-all"
          w="full"
        >
          {table.name}
        </Text>
      </Box>
    </button>
  )
}

function StorageSummary({ tables }: { tables: DatabaseTableInfo[] }) {
  const { t } = useLocale()
  const totalData = tables.reduce((sum, t) => sum + (t.size_bytes ?? 0), 0)
  const totalRows = tables.reduce((sum, t) => sum + (t.rows ?? 0), 0)
  const items = [
    { label: t('db.tools.summaryTables'), value: String(tables.length) },
    { label: t('db.tools.summaryRows'), value: formatRows(totalRows) },
    { label: t('db.tools.summaryData'), value: formatBytes(totalData) },
  ]
  return (
    <Grid templateColumns="repeat(3, 1fr)" gap={2}>
      {items.map((item) => (
        <Box
          key={item.label}
          px={3}
          py={2}
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="var(--radius-input)"
          bg="bg.elevated"
        >
          <Text fontSize="xs" color="fg.muted">
            {item.label}
          </Text>
          <Text fontSize="sm" fontWeight="semibold" mt={0.5}>
            {item.value}
          </Text>
        </Box>
      ))}
    </Grid>
  )
}

export function DatabaseToolsPanel({
  pluginId,
  databaseName,
  enabled,
}: {
  pluginId: string
  databaseName: string
  enabled: boolean
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const tablesQuery = useDatabaseTablesQuery(pluginId, databaseName, enabled)
  const queryMutation = useDatabaseQueryMutation()

  const [tableSearch, setTableSearch] = useState('')
  const [createTableOpen, setCreateTableOpen] = useState(false)
  const [addColumnOpen, setAddColumnOpen] = useState(false)
  const [insertRowOpen, setInsertRowOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const columnsQuery = useDatabaseColumnsQuery(
    pluginId,
    databaseName,
    selectedTable,
    enabled && Boolean(selectedTable),
  )
  const [detailTab, setDetailTab] = useState<'data' | 'stats'>('data')
  const [querySql, setQuerySql] = useState('')
  const [lastResult, setLastResult] = useState<DatabaseQueryResponse | null>(null)
  const [lastResponse, setLastResponse] = useState<DatabaseQueryResponse | null>(null)
  const [queryLog, setQueryLog] = useState<QueryLogEntry[]>([])

  const tables = tablesQuery.data?.items ?? []
  const selectedMeta = useMemo(
    () => tables.find((t) => t.name === selectedTable) ?? null,
    [tables, selectedTable],
  )

  const filteredTables = useMemo(() => {
    const q = tableSearch.trim().toLowerCase()
    if (!q) return tables
    return tables.filter((t) => t.name.toLowerCase().includes(q))
  }, [tables, tableSearch])

  const syntaxHintList = tablesQuery.data?.syntax_hints ?? []
  const baseSuggestions = tablesQuery.data?.suggestions ?? []

  const activeSuggestions = useMemo(() => {
    if (selectedTable) return tableSuggestions(pluginId, selectedTable)
    return baseSuggestions
  }, [baseSuggestions, pluginId, selectedTable])

  const appendLog = useCallback((sql: string, result: DatabaseQueryResponse) => {
    const entry: QueryLogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      at: new Date().toLocaleTimeString(),
      sql,
      ok: result.ok !== false,
      message: result.message ?? result.error ?? '',
      row_count: result.row_count,
      elapsed_ms: result.elapsed_ms,
    }
    setQueryLog((prev) => [entry, ...prev].slice(0, 40))
  }, [])

  const runQuery = useCallback(
    async (sql: string) => {
      const trimmed = sql.trim()
      if (!trimmed) return
      try {
        const result = await queryMutation.mutateAsync({
          pluginId,
          databaseName,
          body: { sql: trimmed, limit: 100 },
        })
        setLastResponse(result)
        appendLog(trimmed, result)
        if (result.ok !== false) {
          setLastResult(result)
          if (result.message) notifySuccess(result.message, { duration: 2500 })
        } else {
          setLastResult(null)
        }
      } catch (err) {
        const message = errorMessageFromUnknown(err)
        const fail: DatabaseQueryResponse = {
          ok: false,
          error: message,
          message,
          columns: [],
          rows: [],
          row_count: 0,
        }
        setLastResponse(fail)
        appendLog(trimmed, fail)
        setLastResult(null)
      }
    },
    [appendLog, databaseName, pluginId, queryMutation],
  )

  const pickSuggestion = useCallback(
    (sql: string) => {
      setQuerySql(sql)
      void runQuery(sql)
    },
    [runQuery],
  )

  const openTable = useCallback(
    (tableName: string) => {
      setSelectedTable(tableName)
      setDetailTab('data')
      const sql = `SELECT * FROM ${quoteTable(pluginId, tableName)} LIMIT 50`
      setQuerySql(sql)
      void runQuery(sql)
    },
    [pluginId, runQuery],
  )

  useEffect(() => {
    if (!enabled) return
    setSelectedTable(null)
    setTableSearch('')
    setLastResult(null)
    setLastResponse(null)
    setQueryLog([])
    setQuerySql(
      pluginId === 'postgresql' ? 'SELECT * FROM pg_catalog.pg_tables LIMIT 10' : 'SHOW TABLES',
    )
  }, [enabled, databaseName, pluginId])

  if (!enabled) {
    return <DataListEmpty>{t('db.config.inspectUnavailable')}</DataListEmpty>
  }

  if (tablesQuery.isLoading) {
    return <FormFieldsSkeleton fields={4} />
  }

  if (tablesQuery.isError) {
    return (
      <VStack align="stretch" gap={3}>
        <DataListEmpty>{t('db.config.tablesLoadFailed')}</DataListEmpty>
        <Button size="sm" variant="outline" onClick={() => void tablesQuery.refetch()}>
          <RefreshCw size={14} />
          {t('db.refresh')}
        </Button>
      </VStack>
    )
  }

  const busy = queryMutation.isPending

  if (selectedTable && selectedMeta) {
    return (
      <VStack align="stretch" gap={3}>
        <HStack justify="space-between" flexWrap="wrap" gap={2}>
          <HStack gap={1} fontSize="sm" minW={0}>
            <Button
              size="xs"
              variant="ghost"
              color="fg.muted"
              fontWeight="normal"
              onClick={() => {
                setSelectedTable(null)
                setLastResult(null)
              }}
            >
              {t('db.tools.tablesTitle')}
            </Button>
            <ChevronRight size={14} color="var(--chakra-colors-fg-muted)" />
            <Text fontWeight="semibold" fontFamily="mono" truncate>
              {selectedTable}
            </Text>
          </HStack>
          <HStack gap={1} flexWrap="wrap">
            <Button size="xs" variant="outline" onClick={() => setAddColumnOpen(true)}>
              {t('db.tools.addColumn')}
            </Button>
            <Button size="xs" variant="outline" onClick={() => setInsertRowOpen(true)}>
              {t('db.tools.insertRow')}
            </Button>
            <IconButton
              size="sm"
              variant="ghost"
              aria-label={t('db.refresh')}
              onClick={() => void runQuery(querySql)}
              loading={busy}
            >
              <RefreshCw size={14} />
            </IconButton>
          </HStack>
        </HStack>

        <QueryWorkspace
          querySql={querySql}
          busy={busy}
          lastResponse={lastResponse}
          suggestions={activeSuggestions}
          syntaxHints={syntaxHintList}
          queryLog={queryLog}
          lastResult={lastResult}
          onSqlChange={setQuerySql}
          onRun={() => void runQuery(querySql)}
          onPickSuggestion={pickSuggestion}
          onClearLog={() => setQueryLog([])}
          pluginId={pluginId}
          databaseName={databaseName}
          tableName={selectedTable}
        />

        <AddColumnDialog
          open={addColumnOpen}
          onClose={() => setAddColumnOpen(false)}
          pluginId={pluginId}
          databaseName={databaseName}
          tableName={selectedTable}
          onDone={() => {
            void tablesQuery.refetch()
            void columnsQuery.refetch()
          }}
        />
        <InsertRowDialog
          open={insertRowOpen}
          onClose={() => setInsertRowOpen(false)}
          pluginId={pluginId}
          databaseName={databaseName}
          tableName={selectedTable}
          columns={columnsQuery.data?.items ?? []}
          onDone={() => void runQuery(querySql)}
        />

        <Tabs.Root
          value={detailTab}
          onValueChange={(d) => setDetailTab(d.value as 'data' | 'stats')}
          variant="line"
          size="sm"
        >
          <Tabs.List borderColor="border.subtle">
            <Tabs.Trigger value="data">{t('db.tools.tabData')}</Tabs.Trigger>
            <Tabs.Trigger value="stats">{t('db.tools.tabStats')}</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        {detailTab === 'data' ? (
          <QueryResultGrid
            columns={lastResult?.columns ?? []}
            rows={lastResult?.rows ?? []}
            meta={
              lastResult
                ? t('db.config.queryResult', {
                    count: lastResult.row_count,
                    ms: lastResult.elapsed_ms ?? 0,
                  })
                : undefined
            }
          />
        ) : (
          <SectionCard>
            <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)' }} gap={3}>
              <Box>
                <Text fontSize="xs" color="fg.muted">
                  {t('db.config.tableRows')}
                </Text>
                <Text fontSize="sm" fontWeight="semibold">
                  {formatRows(selectedMeta.rows)}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="fg.muted">
                  {t('db.config.tableSize')}
                </Text>
                <Text fontSize="sm" fontWeight="semibold">
                  {formatBytes(selectedMeta.size_bytes)}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="fg.muted">
                  {t('db.tools.colEngine')}
                </Text>
                <Text fontSize="sm" fontWeight="semibold" fontFamily="mono">
                  {selectedMeta.engine || '—'}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="fg.muted">
                  {t('db.tools.colType')}
                </Text>
                <Text fontSize="sm" fontWeight="semibold">
                  {selectedMeta.row_type}
                </Text>
              </Box>
            </Grid>
          </SectionCard>
        )}
      </VStack>
    )
  }

  return (
    <VStack align="stretch" gap={3}>
      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <Text fontSize="md" fontWeight="semibold">
          {t('db.tools.tablesTitle')}
        </Text>
        <HStack gap={1} flexWrap="wrap">
          <Button size="sm" colorPalette={accentPalette} onClick={() => setCreateTableOpen(true)}>
            <Plus size={14} />
            {t('db.tools.newTable')}
          </Button>
          <Box position="relative">
            <Box
              position="absolute"
              left={2}
              top="50%"
              transform="translateY(-50%)"
              color="fg.muted"
              pointerEvents="none"
            >
              <Search size={14} />
            </Box>
            <Input
              {...fieldStyles}
              size="sm"
              w="160px"
              pl={7}
              placeholder={t('db.table.searchPlaceholder')}
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </Box>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label={t('db.refresh')}
            loading={tablesQuery.isFetching}
            onClick={() => void tablesQuery.refetch()}
          >
            <RefreshCw size={14} />
          </IconButton>
        </HStack>
      </HStack>

      {tables.length > 0 ? <StorageSummary tables={tables} /> : null}

      <QueryWorkspace
        querySql={querySql}
        busy={busy}
        lastResponse={lastResponse}
        suggestions={activeSuggestions}
        syntaxHints={syntaxHintList}
        queryLog={queryLog}
        lastResult={lastResult}
        onSqlChange={setQuerySql}
        onRun={() => void runQuery(querySql)}
        onPickSuggestion={pickSuggestion}
        onClearLog={() => setQueryLog([])}
        showGrid={Boolean(lastResult && !selectedTable)}
        pluginId={pluginId}
        databaseName={databaseName}
        tableName={null}
      />

      <CreateTableDialog
        open={createTableOpen}
        onClose={() => setCreateTableOpen(false)}
        pluginId={pluginId}
        databaseName={databaseName}
        onCreated={() => void tablesQuery.refetch()}
      />

      {!tables.length ? (
        <DataListEmpty>{t('db.config.noTables')}</DataListEmpty>
      ) : !filteredTables.length ? (
        <DataListEmpty>{t('db.table.noMatch')}</DataListEmpty>
      ) : (
        <Grid templateColumns="repeat(auto-fill, minmax(100px, 1fr))" gap={2}>
          {filteredTables.map((table) => (
            <TableIconCard key={table.name} table={table} onClick={() => openTable(table.name)} />
          ))}
        </Grid>
      )}

      <Text fontSize="xs" color="fg.muted" lineHeight="tall">
        {t('db.tools.hint')}
      </Text>
    </VStack>
  )
}
