import { Box, Button, HStack, Input, NativeSelect, Table } from '@chakra-ui/react'
import { Link2, Plus, RefreshCw, Settings } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DatabaseEnginePluginId } from '../../config/databases'
import {
  useStoreCatalogQuery,
  useStoreConnectMutation,
  useStoreCreateDatabasesMutation,
  useStoreDatabasesQuery,
  useStoreEnvironmentQuery,
  useStoreInstallMutation,
  useStoreInstalledQuery,
  useStoreRefreshMutation,
} from '../../hooks/queries/use-store-query'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type {
  StoreCatalogItem,
  StoreConnectRequest,
  StoreDatabaseEntry,
  StoreInstalled,
} from '../../lib/api'
import { StoreConnectForm } from '../store/StoreConnectForm'
import { StoreInstallDialog, type StoreInstallOptions } from '../store/StoreInstallDialog'
import { statusTone } from '../store/store-utils'
import { DataList, DataListEmpty } from '../ui/DataList'
import { Panel, PanelBody } from '../ui/Panel'
import { FormFieldsSkeleton } from '../ui/PanelSkeleton'
import { StatusBadge } from '../ui/StatusBadge'
import { fieldStyles } from '../ui/field-styles'
import { getDatabaseEngineSetupState } from './database-engine-setup'
import { DatabaseAddDialog, type DatabaseCreateDraft } from './DatabaseAddDialog'
import { DatabaseSetupOverlay } from './DatabaseSetupOverlay'
import { ClickToCopyText } from './ClickToCopyText'

function defaultConnectForm(item: StoreCatalogItem): StoreConnectRequest {
  const form: StoreConnectRequest = {
    host: '127.0.0.1',
    port: item.default_port,
  }
  for (const field of item.connection_fields) {
    if (field.key === 'host' && field.default != null) form.host = String(field.default)
    if (field.key === 'port' && field.default != null) form.port = Number(field.default)
    if (field.key === 'username' && field.default != null) form.username = String(field.default)
    if (field.key === 'database' && field.default != null) form.database = String(field.default)
  }
  return form
}

function EngineTableRow({
  catalog,
  installed,
  database,
  onSettings,
}: {
  catalog: StoreCatalogItem
  installed: StoreInstalled
  database: StoreDatabaseEntry
  onSettings: () => void
}) {
  const { t } = useLocale()
  const config = installed.config
  const host = String(config.host ?? '127.0.0.1')
  const port = config.port != null ? String(config.port) : '—'
  const endpoint = port !== '—' ? `${host}:${port}` : host
  const username = database.username || String(config.username ?? '—')
  const password = database.password || ''

  return (
    <Table.Row _hover={{ bg: 'bg.panelHover' }}>
      <Table.Cell fontWeight="medium">{catalog.name}</Table.Cell>
      <Table.Cell>
        <ClickToCopyText value={username} mono />
      </Table.Cell>
      <Table.Cell fontFamily="mono" fontSize="xs">
        {endpoint}
      </Table.Cell>
      <Table.Cell>
        <ClickToCopyText value={database.name} />
      </Table.Cell>
      <Table.Cell>
        <ClickToCopyText value={password || '—'} masked={Boolean(password)} mono />
      </Table.Cell>
      <Table.Cell fontSize="sm" color="fg.muted">
        {installed.mode ?? '—'}
      </Table.Cell>
      <Table.Cell>
        <StatusBadge status={statusTone(installed.status)} label={installed.status} />
      </Table.Cell>
      <Table.Cell textAlign="right">
        <Button
          size="xs"
          variant="ghost"
          colorPalette="green"
          borderRadius="input"
          onClick={onSettings}
        >
          <Settings size={14} />
          {t('db.table.manage')}
        </Button>
      </Table.Cell>
    </Table.Row>
  )
}

export function DatabaseEnginePanel({
  pluginId,
  onSettings,
}: {
  pluginId: DatabaseEnginePluginId
  onSettings: (id: string) => void
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const env = useStoreEnvironmentQuery()
  const catalog = useStoreCatalogQuery()
  const installedQuery = useStoreInstalledQuery()
  const installMutation = useStoreInstallMutation()
  const connectMutation = useStoreConnectMutation()
  const refreshMutation = useStoreRefreshMutation()
  const createDatabasesMutation = useStoreCreateDatabasesMutation()

  const [search, setSearch] = useState('')
  const [installing, setInstalling] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [showAddDb, setShowAddDb] = useState(false)
  const [showConnect, setShowConnect] = useState(false)
  const [connectForm, setConnectForm] = useState<StoreConnectRequest>({})

  const catalogItem = catalog.data?.find((item) => item.id === pluginId)
  const installed = installedQuery.data?.find((row) => row.plugin_id === pluginId)
  const databasesQuery = useStoreDatabasesQuery(pluginId, Boolean(installed))
  const setup = useMemo(
    () => getDatabaseEngineSetupState(catalogItem, env.data, Boolean(installed)),
    [catalogItem, env.data, installed],
  )

  const serviceLabel = catalogItem?.name ?? pluginId
  const busy =
    installMutation.isPending ||
    connectMutation.isPending ||
    refreshMutation.isPending ||
    createDatabasesMutation.isPending

  const databaseRows = databasesQuery.data?.items ?? []

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return databaseRows
    return databaseRows.filter((row) => {
      const haystack = [
        serviceLabel,
        row.name,
        row.username,
        row.password,
        installed?.status ?? '',
        String(installed?.config.host ?? ''),
        String(installed?.config.port ?? ''),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [
    databaseRows,
    search,
    serviceLabel,
    installed?.config.host,
    installed?.config.port,
    installed?.status,
  ])

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
    await createDatabasesMutation.mutateAsync({
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
    installed &&
    (databasesQuery.data?.supports_create ?? ['mysql', 'postgresql', 'mongodb'].includes(pluginId)),
  )

  return (
    <Box>
      <StoreInstallDialog
        item={catalogItem}
        env={env.data}
        open={showInstall}
        installing={installing}
        onClose={() => setShowInstall(false)}
        onConfirm={(options) => void handleInstallConfirm(options)}
      />
      {installed && canAddDatabase ? (
        <DatabaseAddDialog
          open={showAddDb}
          loading={createDatabasesMutation.isPending}
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
            loading={installing || createDatabasesMutation.isPending}
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
          <StatusBadge
            status={
              installed ? statusTone(installed.status) : setup.canInstall ? 'brand' : 'neutral'
            }
            label={installed ? installed.status : t(setup.statusLabelKey)}
          />
        </HStack>

        <HStack gap={2} flexWrap="wrap">
          <NativeSelect.Root size="sm" w="auto" minW="88px">
            <NativeSelect.Field
              defaultValue="all"
              borderRadius="var(--radius-input)"
              borderColor="border.subtle"
            >
              <option value="all">{t('db.table.filterAll')}</option>
            </NativeSelect.Field>
          </NativeSelect.Root>
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
                void databasesQuery.refetch()
                void refreshMutation.mutateAsync(pluginId)
              }
            }}
          >
            <RefreshCw size={14} />
          </Button>
        </HStack>
      </HStack>

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

      {installed && filteredRows.length > 0 ? (
        <Panel>
          <PanelBody p={0}>
            <DataList>
              <Table.Header bg="bg.panelHover">
                <Table.Row>
                  <Table.ColumnHeader>{t('db.table.service')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('db.table.username')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('db.table.endpoint')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('db.table.database')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('db.table.password')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('db.table.location')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('db.table.status')}</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">{t('db.table.actions')}</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredRows.map((row) => (
                  <EngineTableRow
                    key={row.name}
                    catalog={catalogItem}
                    installed={installed}
                    database={row}
                    onSettings={() => onSettings(pluginId)}
                  />
                ))}
              </Table.Body>
            </DataList>
          </PanelBody>
        </Panel>
      ) : installed && search.trim() ? (
        <DataListEmpty>{t('db.table.noMatch')}</DataListEmpty>
      ) : installed && databaseRows.length === 0 && !databasesQuery.isLoading ? (
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
