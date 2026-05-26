import {
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
import { useEffect, useState } from 'react'
import { DataListEmpty } from '../ui/DataList'
import { SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import {
  useStoreLifecycleMutation,
  useStorePluginDetailQuery,
  useStoreRefreshMutation,
  useStoreUninstallMutation,
} from '../../hooks/queries/use-store-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreCatalogItem } from '../../lib/api'
import { pluginIcon, statusTone } from './store-utils'
import {
  STORE_PLUGIN_SECTIONS,
  type StorePluginSectionId,
} from './store-plugin-sections'

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
  const [section, setSection] = useState<StorePluginSectionId>('service')
  const [watchDaemon, setWatchDaemon] = useState(true)

  const detail = useStorePluginDetailQuery(pluginId)
  const refreshMutation = useStoreRefreshMutation()
  const lifecycleMutation = useStoreLifecycleMutation()
  const uninstallMutation = useStoreUninstallMutation()

  const installation = detail.data?.installation
  const name = catalogItem?.name ?? installation?.name ?? pluginId ?? 'Plugin'
  const Icon = pluginIcon(pluginId ?? '')
  const busy = lifecycleMutation.isPending || uninstallMutation.isPending || refreshMutation.isPending
  const isDocker = installation?.mode === 'docker'
  const status = installation?.status ?? 'unknown'
  const config = installation?.config ?? {}
  const host = String(config.host ?? '127.0.0.1')
  const port = config.port != null ? String(config.port) : '—'

  useEffect(() => {
    if (open && pluginId) {
      setSection('service')
      void refreshMutation.mutateAsync(pluginId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when drawer opens
  }, [open, pluginId])

  async function runLifecycle(action: 'start' | 'stop' | 'restart') {
    if (!pluginId) return
    await lifecycleMutation.mutateAsync({ pluginId, action })
    await refreshMutation.mutateAsync(pluginId)
  }

  async function handleUninstall() {
    if (!pluginId || !confirm(`Uninstall ${name}?`)) return
    await uninstallMutation.mutateAsync(pluginId)
    onClose()
  }

  function renderSection() {
    if (detail.isLoading && !installation) {
      return <DataListEmpty>Loading…</DataListEmpty>
    }
    if (!installation) {
      return <DataListEmpty>Plugin is not installed.</DataListEmpty>
    }

    switch (section) {
      case 'service':
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
              {isDocker ? (
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
              When enabled, the panel will treat this service as critical and surface alerts if it stops.
              Full cron integration is on the roadmap.
            </Text>

            <Separator borderColor="border.subtle" />

            <Button
              size="sm"
              colorPalette="red"
              variant="outline"
              width="full"
              disabled={busy}
              onClick={() => void handleUninstall()}
            >
              Uninstall
            </Button>
          </VStack>
        )
      case 'port':
        return (
          <SectionCard>
            <InfoRow label="Host port" value={port} />
            <InfoRow label="Bind host" value={host} />
            <InfoRow label="Install mode" value={installation.mode ?? '—'} />
            <Text mt={3} fontSize="xs" color="fg.muted">
              Docker installs map this host port to the container. Change port by reinstalling the plugin.
            </Text>
          </SectionCard>
        )
      case 'connection':
        return (
          <SectionCard>
            <InfoRow label="Endpoint" value={port !== '—' ? `${host}:${port}` : host} />
            <InfoRow label="Username" value={String(config.username ?? '—')} />
            <InfoRow label="Database" value={String(config.database ?? '—')} />
            <InfoRow label="Password" value={config.password_set ? '••••••••' : '—'} />
            <InfoRow label="Container" value={String(installation.container_name ?? '—')} />
          </SectionCard>
        )
      case 'storage':
        return (
          <SectionCard>
            <InfoRow label="Plugin ID" value={installation.plugin_id} />
            <InfoRow label="Installed" value={installation.installed_at?.slice(0, 19) ?? '—'} />
            <InfoRow label="Updated" value={installation.updated_at?.slice(0, 19) ?? '—'} />
            <Text mt={3} fontSize="xs" color="fg.muted">
              Compose files and volumes live under the panel store directory for this plugin.
            </Text>
          </SectionCard>
        )
      case 'logs':
        return (
          <DataListEmpty>
            Container log streaming will be added in a future release. Use Docker logs on the host for now.
          </DataListEmpty>
        )
      default:
        return null
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={(e) => !e.open && onClose()} placement="end" size="lg">
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
                  {STORE_PLUGIN_SECTIONS.map((item) => (
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
