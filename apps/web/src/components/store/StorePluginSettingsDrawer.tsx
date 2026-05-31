import {
  Badge,
  Box,
  Button,
  Drawer,
  HStack,
  IconButton,
  Portal,
  Separator,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useManagedDatabaseQuery } from '../../hooks/queries/use-database-engine-query'
import {
  useStoreLifecycleMutation,
  useStorePluginDetailQuery,
  useStoreRefreshMutation,
} from '../../hooks/queries/use-store-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreCatalogItem } from '../../lib/api'
import { isDatabaseCatalogItem } from '../../lib/databases/registry'
import { DatabaseConnectionManage } from '../databases/DatabaseConnectionManage'
import { DatabaseDangerZone } from '../databases/DatabaseDangerZone'
import { DataListEmpty } from '../ui/DataList'
import { FormFieldsSkeleton } from '../ui/PanelSkeleton'
import { SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import { PluginScrapeSpecPanel } from './PluginScrapeSpecPanel'
import { sectionsForPlugin, type StorePluginSectionId } from './store-plugin-sections'
import { pluginIcon, statusTone } from './store-utils'
import { ModuleGuidePanel } from '../modules/ModuleGuidePanel'

function isDatabaseService(item?: StoreCatalogItem | null): boolean {
  if (!item) return false
  return isDatabaseCatalogItem({ id: item.id, category: item.category })
}

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      size="sm"
      width="full"
      justifyContent="flex-start"
      variant={active ? 'subtle' : 'ghost'}
      bg={active ? 'bg.panelHover' : undefined}
      color={active ? 'fg' : 'fg.muted'}
      fontWeight={active ? 'semibold' : 'normal'}
      borderRadius="var(--radius-input)"
      onClick={onClick}
    >
      {label}
    </Button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack
      justify="space-between"
      py={2}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      fontSize="sm"
      gap={4}
    >
      <Text color="fg.muted" flexShrink={0}>
        {label}
      </Text>
      <Text fontWeight="medium" fontFamily="mono" fontSize="xs" textAlign="right" lineClamp={2}>
        {value}
      </Text>
    </HStack>
  )
}

function isScrapePlugin(item?: StoreCatalogItem | null): boolean {
  if (!item) return false
  return item.kind === 'source' || item.kind === 'site' || Boolean(item.scrape_spec)
}

export function StorePluginSettingsDrawer({
  pluginId,
  catalogItem,
  onClose,
}: {
  pluginId: string | null
  catalogItem?: StoreCatalogItem
  onClose: () => void
}) {
  const accentPalette = useAccentPalette()
  const open = Boolean(pluginId)
  const detail = useStorePluginDetailQuery(pluginId)
  const refreshMutation = useStoreRefreshMutation()
  const lifecycleMutation = useStoreLifecycleMutation()
  const merged: StoreCatalogItem | undefined = useMemo(() => {
    if (!pluginId) return catalogItem
    if (detail.data) return { ...catalogItem, ...detail.data, id: pluginId }
    return catalogItem
  }, [catalogItem, detail.data, pluginId])

  const kind = merged?.kind
  const scrapePlugin = isScrapePlugin(merged)
  const isDbService = isDatabaseService(merged)
  const navSections = sectionsForPlugin(kind, {
    isDatabase: isDbService,
    hasGuide: merged?.has_guide,
  })
  const managedQuery = useManagedDatabaseQuery(pluginId, open && isDbService)
  const defaultSection: StorePluginSectionId = merged?.has_guide
    ? 'guide'
    : scrapePlugin
      ? 'specification'
      : 'service'
  const [section, setSection] = useState<StorePluginSectionId>(defaultSection)
  const [watchDaemon, setWatchDaemon] = useState(true)

  const installation = detail.data?.installation
  const name = merged?.name ?? installation?.name ?? pluginId ?? 'Plugin'
  const Icon = pluginIcon(pluginId ?? '', merged?.icon)
  const busy = lifecycleMutation.isPending || refreshMutation.isPending
  const isManaged = installation?.mode === 'docker' || installation?.mode === 'native'
  const status = installation?.status ?? merged?.status ?? 'unknown'
  const scrapeSpec = merged?.scrape_spec
  const domains = merged?.domains ?? []
  const config = installation?.config ?? {}
  const host = String(config.host ?? '127.0.0.1')
  const port = config.port != null ? String(config.port) : '—'

  useEffect(() => {
    if (open && pluginId) {
      setSection(merged?.has_guide ? 'guide' : scrapePlugin ? 'specification' : 'service')
      if (!scrapePlugin) {
        void refreshMutation.mutateAsync(pluginId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when drawer opens (services only)
  }, [open, pluginId, scrapePlugin, merged?.has_guide])

  async function runLifecycle(action: 'start' | 'stop' | 'restart') {
    if (!pluginId) return
    await lifecycleMutation.mutateAsync({ pluginId, action })
    await refreshMutation.mutateAsync(pluginId)
  }

  function renderSection() {
    if (detail.isLoading && !merged && !installation) {
      return <FormFieldsSkeleton fields={4} />
    }

    switch (section) {
      case 'guide':
        return <ModuleGuidePanel moduleId={pluginId} />

      case 'specification':
        if (!scrapeSpec) {
          return <DataListEmpty>No scrape specification for this plugin.</DataListEmpty>
        }
        return <PluginScrapeSpecPanel spec={scrapeSpec} />

      case 'domains':
        return (
          <SectionCard>
            {domains.length ? (
              domains.map((d) => <InfoRow key={d} label="Host" value={d} />)
            ) : (
              <DataListEmpty>No domains configured.</DataListEmpty>
            )}
            {merged?.sandboxed ? (
              <Text mt={3} fontSize="xs" color="fg.muted">
                Sandboxed plugins may only scrape URLs matching these hosts.
              </Text>
            ) : null}
          </SectionCard>
        )

      case 'service':
        if (scrapePlugin && !installation) {
          return (
            <VStack align="stretch" gap={4}>
              <Box>
                <Text fontSize="sm" color="fg.muted" mb={2}>
                  Scraper status
                </Text>
                <HStack gap={2} flexWrap="wrap">
                  <StatusBadge status={statusTone(status)} label={status} />
                  {merged?.kind === 'site' ? (
                    <Badge size="sm" colorPalette="green" variant="subtle" textTransform="none">
                      built-in
                    </Badge>
                  ) : null}
                  {merged?.trusted ? (
                    <Badge size="sm" variant="subtle" textTransform="none">
                      trusted
                    </Badge>
                  ) : null}
                  {merged?.sandboxed ? (
                    <Badge size="sm" colorPalette="orange" variant="subtle" textTransform="none">
                      sandboxed
                    </Badge>
                  ) : null}
                </HStack>
              </Box>
              {merged?.description ? (
                <Text fontSize="sm" color="fg.muted" lineHeight="tall">
                  {merged.description}
                </Text>
              ) : null}
              {merged?.enabled === false ? (
                <Text fontSize="xs" color="fg.muted">
                  Enable this plugin from the catalog card to register its domains with the scraper.
                </Text>
              ) : null}
            </VStack>
          )
        }

        if (!installation) {
          return <DataListEmpty>Plugin is not installed.</DataListEmpty>
        }

        return (
          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={2}>
                Current state
              </Text>
              <HStack gap={2} flexWrap="wrap">
                <StatusBadge status={statusTone(status)} label={status} />
                {installation.probe?.message ? (
                  <Text fontSize="xs" color="fg.muted">
                    {installation.probe.message}
                  </Text>
                ) : null}
              </HStack>
            </Box>

            <HStack gap={2} flexWrap="wrap">
              {isManaged ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="border.subtle"
                    borderRadius="input"
                    disabled={busy || status === 'stopped'}
                    onClick={() => void runLifecycle('stop')}
                  >
                    Stop
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="border.subtle"
                    borderRadius="input"
                    disabled={busy}
                    onClick={() => void runLifecycle('restart')}
                  >
                    Restart
                  </Button>
                  <Button
                    size="sm"
                    colorPalette={accentPalette}
                    borderRadius="input"
                    disabled={busy || status === 'running'}
                    onClick={() => void runLifecycle('start')}
                  >
                    Start
                  </Button>
                </>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                borderColor="border.subtle"
                borderRadius="input"
                disabled={busy}
                onClick={() => pluginId && void refreshMutation.mutateAsync(pluginId)}
              >
                Reload status
              </Button>
            </HStack>

            {!scrapePlugin ? (
              <>
                <Separator borderColor="border.subtle" />

                <HStack justify="space-between">
                  <Text fontSize="sm">Daemon (auto-restart watch)</Text>
                  <Switch.Root
                    checked={watchDaemon}
                    onCheckedChange={(e) => setWatchDaemon(!!e.checked)}
                    colorPalette={accentPalette}
                  >
                    <Switch.HiddenInput />
                    <Switch.Control />
                  </Switch.Root>
                </HStack>
                <Text fontSize="xs" color="fg.muted" lineHeight="tall">
                  When enabled, the panel will treat this service as critical and surface alerts if
                  it stops.
                </Text>
              </>
            ) : null}
          </VStack>
        )

      case 'danger':
        if (!installation || !pluginId) {
          return <DataListEmpty>Plugin is not installed.</DataListEmpty>
        }
        const items = managedQuery.data?.items ?? []
        return (
          <DatabaseDangerZone
            pluginId={pluginId}
            serviceName={name}
            installation={installation}
            databases={items}
            onClose={onClose}
            onDropped={() => {
              void managedQuery.refetch()
              if (pluginId) void refreshMutation.mutateAsync(pluginId)
            }}
          />
        )

      case 'port':
      case 'connection':
        if (merged && isDatabaseService(merged) && installation && pluginId) {
          return (
            <DatabaseConnectionManage
              pluginId={pluginId}
              catalogItem={merged}
              installation={installation}
            />
          )
        }
        if (section === 'port') {
          return (
            <SectionCard>
              <InfoRow label="Host port" value={port} />
              <InfoRow label="Bind host" value={host} />
              <InfoRow label="Install mode" value={installation?.mode ?? '—'} />
            </SectionCard>
          )
        }
        return (
          <SectionCard>
            <InfoRow label="Endpoint" value={port !== '—' ? `${host}:${port}` : host} />
            <InfoRow label="Username" value={String(config.username ?? '—')} />
            <InfoRow label="Database" value={String(config.database ?? '—')} />
            <InfoRow label="Password" value={config.password_set ? '••••••••' : '—'} />
            <InfoRow label="Container" value={String(installation?.container_name ?? '—')} />
          </SectionCard>
        )

      case 'storage':
        return (
          <SectionCard>
            <InfoRow label="Plugin ID" value={installation?.plugin_id ?? pluginId ?? '—'} />
            <InfoRow label="Installed" value={installation?.installed_at?.slice(0, 19) ?? '—'} />
            <InfoRow label="Updated" value={installation?.updated_at?.slice(0, 19) ?? '—'} />
            <Text mt={3} fontSize="xs" color="fg.muted">
              Compose files and volumes live under the panel store directory for this plugin.
            </Text>
          </SectionCard>
        )

      case 'logs':
        return (
          <DataListEmpty>
            Container log streaming will be added in a future release. Use Docker logs on the host
            for now.
          </DataListEmpty>
        )

      default:
        return null
    }
  }

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose()
      }}
      placement="end"
      size="lg"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content maxW="720px" bg="bg.panel" borderRadius="var(--radius-panel)">
            <Drawer.Header borderBottomWidth="1px" borderColor="border.subtle" py={3}>
              <HStack gap={3}>
                <Box
                  p={2}
                  borderRadius="var(--radius-card)"
                  colorPalette={accentPalette}
                  bg="colorPalette.subtle"
                  color="colorPalette.fg"
                >
                  <Icon size={20} />
                </Box>
                <Drawer.Title fontSize="md" fontWeight="semibold">
                  {name}
                </Drawer.Title>
              </HStack>
              <Drawer.CloseTrigger asChild position="absolute" top={3} right={3}>
                <IconButton aria-label="Close" size="sm" variant="ghost">
                  <X size={16} />
                </IconButton>
              </Drawer.CloseTrigger>
            </Drawer.Header>

            <Drawer.Body p={0} display="flex" minH="420px" className="app-scroll">
              <Box
                w="200px"
                flexShrink={0}
                borderRightWidth="1px"
                borderColor="border.subtle"
                p={3}
                bg="bg.panelHover"
              >
                <VStack align="stretch" gap={0.5}>
                  {navSections.map((item) => (
                    <NavItem
                      key={item.id}
                      label={item.label}
                      active={section === item.id}
                      onClick={() => setSection(item.id)}
                    />
                  ))}
                </VStack>
              </Box>

              <Box flex={1} p={4} minW={0}>
                {renderSection()}
              </Box>
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}
