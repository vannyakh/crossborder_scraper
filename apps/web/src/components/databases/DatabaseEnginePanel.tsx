import { Box, Button, HStack, Input, Table, Text } from '@chakra-ui/react'
import { Link2, Plus, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  useCreateLogicalDatabaseMutation,
  useDatabaseProvidersQuery,
  useManagedDatabaseQuery,
} from '../../hooks/queries/use-database-engine-query'
import {
  useStoreCatalogQuery,
  useStoreConnectMutation,
  useStoreEnvironmentQuery,
  useStoreInstallMutation,
  useStoreInstalledQuery,
  useStoreRefreshMutation,
} from '../../hooks/queries/use-store-query'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreConnectRequest, StoreDatabaseEntry } from '../../lib/api'
import type { DatabaseEnginePluginId } from '../../lib/databases'
import { StoreConnectForm } from '../store/StoreConnectForm'
import type { StoreInstallOptions } from '../store/StoreInstallDialog'
import { statusTone } from '../store/store-utils'
import { DataList, DataListEmpty } from '../ui/DataList'
import { Panel, PanelBody } from '../ui/Panel'
import { FormFieldsSkeleton } from '../ui/PanelSkeleton'
import { StatusBadge } from '../ui/StatusBadge'
import { fieldStyles } from '../ui/field-styles'
import { DatabaseAddDialog, type DatabaseCreateDraft } from './DatabaseAddDialog'
import { DatabaseConfigDrawer } from './DatabaseConfigDrawer'
import { DatabaseEngineTableRow } from './DatabaseEngineTableRow'
import { DatabaseInstallDialog } from './DatabaseInstallDialog'
import { DatabaseSetupOverlay } from './DatabaseSetupOverlay'
import { getDatabaseEngineSetupState } from './database-engine-setup'
import { defaultConnectForm } from './db-form-utils'

function rowMatchesSearch(
  row: StoreDatabaseEntry,
  q: string,
  connectionHost: string,
  port: string,
) {
  const haystack = [row.name, row.username, row.password, row.access, connectionHost, port]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function DatabaseEnginePanel({ pluginId }: { pluginId: DatabaseEnginePluginId }) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const env = useStoreEnvironmentQuery()
  const catalog = useStoreCatalogQuery()
  const installedQuery = useStoreInstalledQuery()
  const installMutation = useStoreInstallMutation()
  const connectMutation = useStoreConnectMutation()
  const refreshMutation = useStoreRefreshMutation()
  const createMutation = useCreateLogicalDatabaseMutation()

  const [search, setSearch] = useState('')
  const [installing, setInstalling] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [showAddDb, setShowAddDb] = useState(false)
  const [showConnect, setShowConnect] = useState(false)
  const [connectForm, setConnectForm] = useState<StoreConnectRequest>({})
  const [configDbName, setConfigDbName] = useState<string | null>(null)

  const catalogItem = catalog.data?.find((item) => item.id === pluginId)
  const installed = installedQuery.data?.find((row) => row.plugin_id === pluginId)
  const providersQuery = useDatabaseProvidersQuery()
  const provider = providersQuery.data?.find((row) => row.id === pluginId)
  const managedQuery = useManagedDatabaseQuery(pluginId, Boolean(installed))
  const setup = useMemo(
    () => getDatabaseEngineSetupState(catalogItem, env.data, Boolean(installed)),
    [catalogItem, env.data, installed],
  )

  const serviceLabel = catalogItem?.name ?? pluginId
  const busy =
    installMutation.isPending ||
    connectMutation.isPending ||
    refreshMutation.isPending ||
    createMutation.isPending

  const managedData = managedQuery.data
  const connection = managedData?.connection
  const host = connection?.host ?? '127.0.0.1'
  const port = connection?.port != null ? String(connection.port) : ''
  const allRows = useMemo(() => managedData?.items ?? [], [managedData?.items])
  const supportsOptimize = managedData?.supports_optimize ?? false
  const supportsPermission = managedData?.supports_permission ?? false
  const canDrop = ['mysql', 'postgresql', 'mongodb'].includes(pluginId)

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allRows
    return allRows.filter((row) => rowMatchesSearch(row, q, host, port))
  }, [allRows, search, host, port])

  const configRow = useMemo(
    () => allRows.find((row) => row.name === configDbName) ?? null,
    [allRows, configDbName],
  )

  async function handleInstallConfirm(options: StoreInstallOptions) {
    setInstalling(true)
    try {
      await installMutation.mutateAsync({
        pluginId: options.pluginId,
        mode: options.mode,
        version: options.version,
        port: options.port,
      })
      setShowInstall(false)
    } finally {
      setInstalling(false)
    }
  }

  function openAddDb() {
    if (installed) {
      setShowAddDb(true)
      return
    }
    setShowInstall(true)
  }

  function openConnect() {
    if (!catalogItem) return
    setConnectForm(defaultConnectForm(catalogItem))
    setShowConnect(true)
  }

  async function submitConnect() {
    await connectMutation.mutateAsync({ pluginId, body: connectForm })
    setShowConnect(false)
  }

  async function handleCreateDatabase(draft: DatabaseCreateDraft) {
    await createMutation.mutateAsync({
      pluginId,
      databases: [
        {
          name: draft.name.trim(),
          username: draft.username.trim() || undefined,
          password: draft.password.trim() || undefined,
          charset: draft.charset,
          access: draft.access,
        },
      ],
    })
    setShowAddDb(false)
  }

  if (catalog.isLoading || installedQuery.isLoading) {
    return <FormFieldsSkeleton fields={4} />
  }

  if (!catalogItem) {
    return <DataListEmpty>{t('db.engine.unavailable')}</DataListEmpty>
  }

  const canAddDatabase = Boolean(
    installed && (managedData?.supports_create ?? provider?.supports_logical_create),
  )
  const extraCount = managedData?.extra_logical_count ?? 0
  const status = connection?.status ?? installed?.status ?? 'unknown'

  return (
    <Box>
      <DatabaseConfigDrawer
        pluginId={pluginId}
        row={configRow}
        connection={connection}
        supportsOptimize={supportsOptimize}
        supportsPermission={supportsPermission}
        supportsInspect={managedData?.supports_inspect ?? false}
        canDrop={canDrop}
        onClose={() => setConfigDbName(null)}
        onUpdated={() => void managedQuery.refetch()}
      />
      <DatabaseInstallDialog
        pluginId={pluginId}
        open={showInstall}
        installing={installing}
        onClose={() => setShowInstall(false)}
        onConfirm={(options) => void handleInstallConfirm(options)}
      />
      {installed && canAddDatabase ? (
        <DatabaseAddDialog
          open={showAddDb}
          loading={createMutation.isPending}
          catalogItem={catalogItem}
          onClose={() => setShowAddDb(false)}
          onConfirm={handleCreateDatabase}
        />
      ) : null}
      <HStack
        mb={4}
        gap={2}
        flexWrap="wrap"
        justify="space-between"
        align={{ base: 'stretch', md: 'center' }}
      >
        <HStack gap={2} flexWrap="wrap">
          <Button
            size="sm"
            colorPalette={accentPalette}
            borderRadius="input"
            loading={installing || createMutation.isPending}
            disabled={!installed && !setup.canInstall}
            onClick={openAddDb}
          >
            <Plus size={14} />
            {t('db.engine.addDb')}
          </Button>
          {catalogItem.supports_external ? (
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              borderRadius="input"
              disabled={Boolean(installed)}
              onClick={openConnect}
            >
              <Link2 size={14} />
              {t('db.install.connectExternal')}
            </Button>
          ) : null}
          {installed ? (
            <StatusBadge status={statusTone(status)} label={`${serviceLabel} · ${status}`} />
          ) : (
            <StatusBadge
              status={setup.canInstall ? 'brand' : 'neutral'}
              label={t(setup.statusLabelKey)}
            />
          )}
        </HStack>

        <HStack gap={2} flexWrap="wrap">
          <Input
            {...fieldStyles}
            size="sm"
            w={{ base: 'full', sm: '200px' }}
            placeholder={t('db.table.searchPlaceholder')}
            value={search}
            disabled={!installed}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            loading={busy}
            onClick={() => {
              void catalog.refetch()
              void installedQuery.refetch()
              if (installed) {
                void managedQuery.refetch()
                void refreshMutation.mutateAsync(pluginId)
              }
            }}
          >
            <RefreshCw size={14} />
          </Button>
        </HStack>
      </HStack>

      {extraCount > 0 ? (
        <Text mb={3} fontSize="xs" color="fg.muted">
          {t('db.engine.extraLogical', { count: extraCount })}
        </Text>
      ) : null}

      {showConnect ? (
        <StoreConnectForm
          item={catalogItem}
          form={connectForm}
          loading={connectMutation.isPending}
          onChange={setConnectForm}
          onSubmit={() => void submitConnect()}
          onClose={() => setShowConnect(false)}
        />
      ) : null}

      {installed && visibleRows.length > 0 ? (
        <Panel>
          <PanelBody p={0}>
            <DataList>
              <Table.Header bg="bg.panelHover">
                <Table.Row>
                  <Table.ColumnHeader>{t('db.table.database')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('db.table.username')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('db.table.password')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('db.table.location')}</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">{t('db.table.actions')}</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {visibleRows.map((row) => (
                  <DatabaseEngineTableRow
                    key={row.name}
                    database={row}
                    onConfigure={(entry) => setConfigDbName(entry.name)}
                  />
                ))}
              </Table.Body>
            </DataList>
          </PanelBody>
        </Panel>
      ) : installed && search.trim() ? (
        <DataListEmpty>{t('db.table.noMatch')}</DataListEmpty>
      ) : installed && !allRows.length && !managedQuery.isLoading ? (
        <DataListEmpty>{t('db.create.emptyList')}</DataListEmpty>
      ) : !installed ? (
        <DatabaseSetupOverlay
          catalogItem={catalogItem}
          setup={setup}
          installing={installing}
          onInstall={() => setShowInstall(true)}
          onConnectExternal={openConnect}
        />
      ) : (
        <FormFieldsSkeleton fields={2} />
      )}
    </Box>
  )
}
