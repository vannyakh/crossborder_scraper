import {
  Box,
  Button,
  HStack,
  Input,
  NativeSelect,
  Table,
  Text,
} from '@chakra-ui/react'
import { Link2, Plus, RefreshCw, Settings } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DatabaseEnginePluginId } from '../../config/databases'
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
import type { StoreCatalogItem, StoreConnectRequest, StoreInstalled } from '../../lib/api'
import { StoreConnectForm } from '../store/StoreConnectForm'
import { StoreInstallDialog, type StoreInstallOptions } from '../store/StoreInstallDialog'
import { pluginIcon, statusTone } from '../store/store-utils'
import { DataList, DataListEmpty } from '../ui/DataList'
import { FormFieldsSkeleton } from '../ui/PanelSkeleton'
import { Panel, PanelBody } from '../ui/Panel'
import { StatusBadge } from '../ui/StatusBadge'
import { fieldStyles } from '../ui/field-styles'

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
  onSettings,
}: {
  catalog: StoreCatalogItem
  installed: StoreInstalled
  onSettings: () => void
}) {
  const { t } = useLocale()
  const config = installed.config
  const host = String(config.host ?? '127.0.0.1')
  const port = config.port != null ? String(config.port) : '—'
  const endpoint = port !== '—' ? `${host}:${port}` : host

  return (
    <Table.Row _hover={{ bg: 'bg.panelHover' }}>
      <Table.Cell fontWeight="medium">{catalog.name}</Table.Cell>
      <Table.Cell fontSize="sm">{String(config.username ?? '—')}</Table.Cell>
      <Table.Cell fontFamily="mono" fontSize="xs">
        {endpoint}
      </Table.Cell>
      <Table.Cell fontSize="sm">{String(config.database ?? '—')}</Table.Cell>
      <Table.Cell fontSize="sm">{config.password_set ? '••••••••' : '—'}</Table.Cell>
      <Table.Cell fontSize="sm" color="fg.muted">
        {installed.mode ?? '—'}
      </Table.Cell>
      <Table.Cell>
        <StatusBadge status={statusTone(installed.status)} label={installed.status} />
      </Table.Cell>
      <Table.Cell>
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

  const [search, setSearch] = useState('')
  const [installing, setInstalling] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [showConnect, setShowConnect] = useState(false)
  const [connectForm, setConnectForm] = useState<StoreConnectRequest>({})

  const dockerReady = Boolean(env.data?.docker_available && env.data?.compose_available)
  const nativeReady = Boolean(env.data?.native_driver_available)
  const catalogItem = catalog.data?.find((item) => item.id === pluginId)
  const installed = installedQuery.data?.find((row) => row.plugin_id === pluginId)
  const canInstall =
    !installed &&
    ((catalogItem?.supports_native && nativeReady) ||
      (catalogItem?.supports_docker && dockerReady))

  const serviceLabel = catalogItem?.name ?? pluginId
  const Icon = pluginIcon(pluginId)
  const busy = installMutation.isPending || connectMutation.isPending || refreshMutation.isPending

  const tableVisible = useMemo(() => {
    if (!installed) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    const haystack = [
      serviceLabel,
      installed.status,
      String(installed.config.host ?? ''),
      String(installed.config.port ?? ''),
      String(installed.config.username ?? ''),
      String(installed.config.database ?? ''),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  }, [installed, search, serviceLabel])

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

  function openConnect() {
    if (!catalogItem) return
    setConnectForm(defaultConnectForm(catalogItem))
    setShowConnect(true)
  }

  async function submitConnect() {
    await connectMutation.mutateAsync({ pluginId, body: connectForm })
    setShowConnect(false)
  }

  if (catalog.isLoading || installedQuery.isLoading) {
    return <FormFieldsSkeleton fields={4} />
  }

  if (!catalogItem) {
    return <DataListEmpty>{t('db.engine.unavailable')}</DataListEmpty>
  }

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
            loading={installing}
            disabled={Boolean(installed) || !canInstall}
            onClick={() => setShowInstall(true)}
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
            status={installed ? statusTone(installed.status) : 'neutral'}
            label={installed ? installed.status : t('db.engine.notInstalled')}
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
              if (installed) void refreshMutation.mutateAsync(pluginId)
            }}
          >
            <RefreshCw size={14} />
          </Button>
        </HStack>
      </HStack>

      {!canInstall && !installed && (catalogItem.supports_native || catalogItem.supports_docker) ? (
        <Text mb={3} fontSize="xs" color="fg.subtle">
          {t('db.install.dockerHint')}
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

      {installed && tableVisible ? (
        <Panel overflow="hidden">
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
                <EngineTableRow
                  catalog={catalogItem}
                  installed={installed}
                  onSettings={() => onSettings(pluginId)}
                />
              </Table.Body>
            </DataList>
          </PanelBody>
        </Panel>
      ) : installed && search.trim() ? (
        <DataListEmpty>{t('db.table.noMatch')}</DataListEmpty>
      ) : (
        <Panel>
          <PanelBody py={10}>
            <DataListEmpty>
              <Box textAlign="center">
                <Box
                  mx="auto"
                  mb={3}
                  w="fit-content"
                  p={3}
                  borderRadius="full"
                  bg="bg.panelHover"
                  color="fg.muted"
                >
                  <Icon size={28} strokeWidth={1.75} />
                </Box>
                <Text fontWeight="medium" mb={1}>
                  {t('db.engine.emptyTitle', { engine: serviceLabel })}
                </Text>
                <Text fontSize="sm" color="fg.muted" mb={4}>
                  {catalogItem.description}
                </Text>
                <HStack justify="center" gap={2} flexWrap="wrap">
                  <Button
                    size="sm"
                    colorPalette={accentPalette}
                    borderRadius="input"
                    loading={installing}
                    disabled={!canInstall}
                    onClick={() => void handleInstallConfirm({
                      pluginId: pluginId,
                      mode: 'native',
                      version: catalogItem.version,
                      port: catalogItem.default_port ?? 0,
                    })}
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
                      onClick={openConnect}
                    >
                      {t('db.install.connectExternal')}
                    </Button>
                  ) : null}
                </HStack>
              </Box>
            </DataListEmpty>
          </PanelBody>
        </Panel>
      )}
    </Box>
  )
}
