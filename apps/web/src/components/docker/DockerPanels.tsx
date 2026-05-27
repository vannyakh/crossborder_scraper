import { Box, Button, Grid, HStack, Input, Separator, SimpleGrid, Switch, Tabs, Text } from '@chakra-ui/react'
import { ExternalLink, Play, RefreshCw, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useDockerConfigMutation,
  useDockerConfigQuery,
  useDockerContainerActionMutation,
  useDockerContainersQuery,
  useDockerHubQuery,
  useDockerInstallMutation,
  useDockerRunMutation,
  useDockerServiceMutation,
  useDockerStatusQuery,
} from '../../hooks/queries/use-docker-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { DockerHubItem } from '../../lib/api'
import { ROUTE_PATHS } from '../../routes/route-config'
import { Toolbar } from '../layout/Toolbar'
import { DataListEmpty } from '../ui/DataList'
import { SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack justify="space-between" py={2} borderBottomWidth="1px" borderColor="border.subtle" fontSize="sm">
      <Text color="fg.muted">{label}</Text>
      <Text fontWeight="medium" fontFamily="mono" fontSize="xs" textAlign="right" lineClamp={2}>
        {value || '—'}
      </Text>
    </HStack>
  )
}

function statusTone(status: string): 'success' | 'running' | 'neutral' | 'danger' {
  if (status === 'running') return 'success'
  if (status === 'stopped') return 'running'
  if (status === 'not_installed') return 'danger'
  return 'neutral'
}

function DockerServerTab() {
  const accentPalette = useAccentPalette()
  const statusQuery = useDockerStatusQuery()
  const configQuery = useDockerConfigQuery()
  const installMutation = useDockerInstallMutation()
  const serviceMutation = useDockerServiceMutation()
  const configMutation = useDockerConfigMutation()

  const status = statusQuery.data
  const config = configQuery.data

  const [mirror, setMirror] = useState('')
  const [composePath, setComposePath] = useState('')
  const [installDir, setInstallDir] = useState('')

  useEffect(() => {
    if (config) {
      setMirror(config.registry_mirrors[0] ?? '')
      setComposePath(config.compose_path)
      setInstallDir(config.install_dir)
    }
  }, [config])

  const busy =
    installMutation.isPending || serviceMutation.isPending || configMutation.isPending

  return (
    <Box>
      {status?.needs_install ? (
        <SectionCard mb={4} p={4} borderColor="orange.500">
          <HStack justify="space-between" flexWrap="wrap" gap={3}>
            <Text fontSize="sm">
              Docker is not installed on this host. Install Docker Engine to run containers and use the App Store one-click services.
            </Text>
            <Button
              size="sm"
              colorPalette={accentPalette}
              loading={installMutation.isPending}
              disabled={!status.can_install}
              onClick={() => void installMutation.mutateAsync()}
            >
              Install Docker
            </Button>
          </HStack>
          {installMutation.data?.messages?.length ? (
            <Text mt={2} fontSize="xs" color="fg.muted" whiteSpace="pre-wrap">
              {installMutation.data.messages.join('\n')}
            </Text>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard mb={4} p={4}>
        <HStack justify="space-between" flexWrap="wrap" gap={3} mb={3}>
          <HStack gap={2}>
            <Text fontWeight="semibold">Docker server</Text>
            {status ? (
              <StatusBadge
                status={statusTone(status.service_status)}
                label={status.service_status.replace('_', ' ')}
              />
            ) : null}
          </HStack>
          <HStack gap={2}>
            <Button
              size="sm"
              colorPalette={accentPalette}
              disabled={busy || !status?.installed}
              loading={serviceMutation.isPending}
              onClick={() => void serviceMutation.mutateAsync('start')}
            >
              Start
            </Button>
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              disabled={busy || !status?.installed}
              onClick={() => void serviceMutation.mutateAsync('restart')}
            >
              Restart
            </Button>
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              disabled={busy || !status?.installed}
              onClick={() => void serviceMutation.mutateAsync('stop')}
            >
              Stop
            </Button>
          </HStack>
        </HStack>

        {serviceMutation.data?.message ? (
          <Text fontSize="xs" color="fg.muted" mb={2}>
            {serviceMutation.data.message}
          </Text>
        ) : null}

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <Box>
            <InfoRow label="Docker version" value={status?.docker_version ?? ''} />
            <InfoRow label="Compose version" value={status?.compose_version ?? ''} />
            <InfoRow label="Daemon" value={status?.daemon_running ? 'reachable' : 'not reachable'} />
            <InfoRow label="Unix socket" value={status?.unix_socket ?? ''} />
          </Box>
          <Box>
            <InfoRow label="Hostname" value={status?.hostname ?? ''} />
            <InfoRow label="System" value={status?.system ?? ''} />
            <InfoRow label="Architecture" value={status?.architecture ?? ''} />
            <InfoRow label="Kernel" value={status?.kernel ?? ''} />
            <InfoRow
              label="CPU / Memory"
              value={`${status?.cpu_cores ?? '—'} cores · ${status?.memory_gb != null ? `${status.memory_gb} GB` : '—'}`}
            />
          </Box>
        </SimpleGrid>
      </SectionCard>

      <SectionCard mb={4} p={4}>
        <Text fontWeight="semibold" mb={3}>
          Panel Docker settings
        </Text>
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3}>
          <Box>
            <Text fontSize="xs" color="fg.muted" mb={1}>
              Registry mirror (acceleration URL)
            </Text>
            <HStack>
              <Input
                size="sm"
                value={mirror}
                placeholder={config?.registry_mirror_display ?? 'https://…'}
                onChange={(e) => setMirror(e.target.value)}
              />
              <Button
                size="sm"
                colorPalette={accentPalette}
                loading={configMutation.isPending}
                onClick={() =>
                  void configMutation.mutateAsync({ registry_mirror: mirror })
                }
              >
                Save
              </Button>
            </HStack>
          </Box>
          <Box>
            <Text fontSize="xs" color="fg.muted" mb={1}>
              Compose project path
            </Text>
            <HStack>
              <Input size="sm" value={composePath} onChange={(e) => setComposePath(e.target.value)} />
              <Button
                size="sm"
                variant="outline"
                borderColor="border.subtle"
                onClick={() => void configMutation.mutateAsync({ compose_path: composePath })}
              >
                Modify
              </Button>
            </HStack>
          </Box>
          <Box gridColumn={{ md: '1 / -1' }}>
            <Text fontSize="xs" color="fg.muted" mb={1}>
              One-click install directory
            </Text>
            <HStack>
              <Input size="sm" value={installDir} onChange={(e) => setInstallDir(e.target.value)} />
              <Button
                size="sm"
                variant="outline"
                borderColor="border.subtle"
                onClick={() => void configMutation.mutateAsync({ install_dir: installDir })}
              >
                Modify
              </Button>
            </HStack>
          </Box>
        </Grid>

        <Separator my={4} borderColor="border.subtle" />

        <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4}>
          <HStack justify="space-between">
            <Box>
              <Text fontSize="sm">IPv6 network</Text>
              <Text fontSize="xs" color="fg.muted">
                Requires daemon restart when applied on host
              </Text>
            </Box>
            <Switch.Root
              checked={config?.ipv6 ?? false}
              colorPalette={accentPalette}
              onCheckedChange={(e) => void configMutation.mutateAsync({ ipv6: e.checked })}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>
          <HStack justify="space-between">
            <Box>
              <Text fontSize="sm">iptables</Text>
              <Text fontSize="xs" color="fg.muted">
                Docker-managed firewall rules
              </Text>
            </Box>
            <Switch.Root
              checked={config?.iptables ?? true}
              colorPalette={accentPalette}
              onCheckedChange={(e) => void configMutation.mutateAsync({ iptables: e.checked })}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>
          <HStack justify="space-between">
            <Box>
              <Text fontSize="sm">live-restore</Text>
              <Text fontSize="xs" color="fg.muted">
                Keep containers running if daemon stops
              </Text>
            </Box>
            <Switch.Root
              checked={config?.live_restore ?? false}
              colorPalette={accentPalette}
              onCheckedChange={(e) => void configMutation.mutateAsync({ live_restore: e.checked })}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>
        </SimpleGrid>

        <Text mt={3} fontSize="xs" color="fg.muted">
          Panel settings are stored in {status?.config_path || 'config/docker.yaml'}. Host daemon.json changes require root on the VPS.
        </Text>
      </SectionCard>

      <SectionCard p={4}>
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="semibold">App Store integration</Text>
          <Button size="sm" variant="outline" borderColor="border.subtle" asChild>
            <Link to={ROUTE_PATHS.store}>
              Open App Store
              <ExternalLink size={14} />
            </Link>
          </Button>
        </HStack>
        <Text fontSize="sm" color="fg.muted">
          Redis, PostgreSQL, MySQL, and other infra plugins install as Docker Compose stacks under the install directory above.
        </Text>
      </SectionCard>
    </Box>
  )
}

function DockerContainersTab({ enabled }: { enabled: boolean }) {
  const accentPalette = useAccentPalette()
  const containersQuery = useDockerContainersQuery(enabled)
  const actionMutation = useDockerContainerActionMutation()
  const items = containersQuery.data?.items ?? []

  return (
    <Box>
      {containersQuery.data?.error ? (
        <SectionCard mb={4} p={3} borderColor="orange.500">
          <Text fontSize="sm">{containersQuery.data.error}</Text>
        </SectionCard>
      ) : null}

      {items.length === 0 ? (
        <DataListEmpty>No containers found. Pull an image from the Hub tab or install from App Store.</DataListEmpty>
      ) : (
        <SectionCard p={0} overflow="hidden">
          {items.map((c) => (
            <Box key={c.id} px={4} py={3} borderBottomWidth="1px" borderColor="border.subtle">
              <HStack justify="space-between" align="start" gap={3} flexWrap="wrap">
                <Box minW={0} flex={1}>
                  <HStack gap={2} mb={1}>
                    <Text fontWeight="semibold" lineClamp={1}>
                      {c.name || c.id.slice(0, 12)}
                    </Text>
                    <StatusBadge status={c.running ? 'success' : 'neutral'} label={c.running ? 'running' : 'stopped'} />
                  </HStack>
                  <Text fontSize="sm" color="fg.muted" lineClamp={1}>
                    {c.image}
                  </Text>
                  <Text fontSize="xs" color="fg.subtle" mt={1}>
                    {c.ports || c.status}
                  </Text>
                </Box>
                <HStack gap={1} flexShrink={0}>
                  {!c.running ? (
                    <Button
                      size="xs"
                      colorPalette={accentPalette}
                      loading={actionMutation.isPending}
                      onClick={() => void actionMutation.mutateAsync({ id: c.id, action: 'start' })}
                    >
                      Start
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      variant="outline"
                      borderColor="border.subtle"
                      loading={actionMutation.isPending}
                      onClick={() => void actionMutation.mutateAsync({ id: c.id, action: 'stop' })}
                    >
                      Stop
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="outline"
                    borderColor="border.subtle"
                    loading={actionMutation.isPending}
                    onClick={() => void actionMutation.mutateAsync({ id: c.id, action: 'restart' })}
                  >
                    Restart
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    colorPalette="red"
                    loading={actionMutation.isPending}
                    onClick={() => void actionMutation.mutateAsync({ id: c.id, action: 'remove' })}
                  >
                    Remove
                  </Button>
                </HStack>
              </HStack>
            </Box>
          ))}
        </SectionCard>
      )}
    </Box>
  )
}

function HubCard({
  item,
  busy,
  onRun,
}: {
  item: DockerHubItem
  busy: boolean
  onRun: (image: string) => void
}) {
  const accentPalette = useAccentPalette()

  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-panel)"
      bg="bg.elevated"
      p={4}
      h="full"
      display="flex"
      flexDirection="column"
    >
      <Text fontWeight="semibold" lineClamp={1}>
        {item.name}
      </Text>
      <Text fontSize="xs" color="fg.muted" fontFamily="mono" mt={1} lineClamp={1}>
        {item.image}
      </Text>
      <Text fontSize="sm" color="fg.muted" mt={2} flex={1} lineClamp={3}>
        {item.description || 'No description'}
      </Text>
      <Button
        size="sm"
        mt={3}
        colorPalette={accentPalette}
        disabled={busy}
        onClick={() => onRun(item.image)}
      >
        <Play size={14} />
        Quick run
      </Button>
    </Box>
  )
}

function DockerHubTab({ dockerReady }: { dockerReady: boolean }) {
  const accentPalette = useAccentPalette()
  const [search, setSearch] = useState('')
  const hubQuery = useDockerHubQuery(search)
  const runMutation = useDockerRunMutation()

  const items = hubQuery.data?.items ?? []

  return (
    <Box>
      {!dockerReady ? (
        <SectionCard mb={4} p={3} borderColor="orange.500">
          <Text fontSize="sm">Install and start Docker on the Server tab before pulling or running images.</Text>
        </SectionCard>
      ) : null}

      <HStack mb={4} gap={2}>
        <Input
          flex={1}
          size="sm"
          placeholder="Search Docker Hub…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button size="sm" variant="outline" borderColor="border.subtle" onClick={() => void hubQuery.refetch()}>
          <RefreshCw size={14} />
          Search
        </Button>
      </HStack>

      {hubQuery.data?.error ? (
        <Text fontSize="sm" color="red.500" mb={3}>
          {hubQuery.data.error}
        </Text>
      ) : null}

      {runMutation.data?.message ? (
        <SectionCard mb={4} p={3}>
          <Text fontSize="sm" color={runMutation.data.ok ? 'fg.default' : 'red.500'}>
            {runMutation.data.message}
          </Text>
        </SectionCard>
      ) : null}

      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }} gap={3}>
        {items.map((item) => (
          <HubCard
            key={item.image}
            item={item}
            busy={runMutation.isPending}
            onRun={(image) => void runMutation.mutateAsync({ image })}
          />
        ))}
      </Grid>

      {items.length === 0 && !hubQuery.isLoading ? (
        <DataListEmpty>No Hub results. Try another search term.</DataListEmpty>
      ) : null}

      <SectionCard mt={4} p={4}>
        <Text fontWeight="semibold" mb={2}>
          Custom image
        </Text>
        <CustomRunForm busy={runMutation.isPending || !dockerReady} onRun={(payload) => void runMutation.mutateAsync(payload)} accentPalette={accentPalette} />
      </SectionCard>
    </Box>
  )
}

function CustomRunForm({
  busy,
  onRun,
  accentPalette,
}: {
  busy: boolean
  onRun: (payload: { image: string; name?: string; host_port?: number }) => void
  accentPalette: string
}) {
  const [image, setImage] = useState('')
  const [name, setName] = useState('')
  const [hostPort, setHostPort] = useState('')

  return (
    <Grid templateColumns={{ base: '1fr', md: '2fr 1fr 1fr auto' }} gap={2}>
      <Input size="sm" placeholder="image:tag" value={image} onChange={(e) => setImage(e.target.value)} />
      <Input size="sm" placeholder="name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        size="sm"
        placeholder="host port"
        value={hostPort}
        onChange={(e) => setHostPort(e.target.value)}
      />
      <Button
        size="sm"
        colorPalette={accentPalette}
        disabled={busy || !image.trim()}
        onClick={() =>
          onRun({
            image: image.trim(),
            name: name.trim() || undefined,
            host_port: hostPort ? Number(hostPort) : undefined,
          })
        }
      >
        Run
      </Button>
    </Grid>
  )
}

export function DockerPanels() {
  const accentPalette = useAccentPalette()
  const statusQuery = useDockerStatusQuery()
  const [tab, setTab] = useState<'server' | 'containers' | 'hub'>('server')

  const dockerReady = Boolean(statusQuery.data?.docker_available)
  const error = statusQuery.error

  return (
    <>
      <Toolbar
        title="Docker server"
        description="Install Docker Engine, manage the daemon, browse Hub images, and run containers on this VPS"
        actions={
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            loading={statusQuery.isFetching}
            onClick={() => void statusQuery.refetch()}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        }
      />

      {error ? (
        <SectionCard mb={4} p={3} borderColor="red.500">
          <Text fontSize="sm" color="red.500">
            {String((error as Error).message || error)}
          </Text>
        </SectionCard>
      ) : null}

      <Tabs.Root
        value={tab}
        onValueChange={(d) => setTab((d.value as typeof tab) ?? 'server')}
        variant="line"
        size="sm"
      >
        <Tabs.List mb={3}>
          <Tabs.Trigger value="server">
            <Wrench size={14} />
            Server
          </Tabs.Trigger>
          <Tabs.Trigger value="containers">Containers</Tabs.Trigger>
          <Tabs.Trigger value="hub">Hub catalog</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="server" pt={0}>
          <DockerServerTab />
        </Tabs.Content>
        <Tabs.Content value="containers" pt={0}>
          <DockerContainersTab enabled={tab === 'containers'} />
        </Tabs.Content>
        <Tabs.Content value="hub" pt={0}>
          <DockerHubTab dockerReady={dockerReady} />
        </Tabs.Content>
      </Tabs.Root>

      <Text mt={4} fontSize="xs" color="fg.subtle">
        For managed database and cache stacks with health probes, use the{' '}
        <Link to={ROUTE_PATHS.store} style={{ color: `var(--chakra-colors-${accentPalette}-fg)` }}>
          App Store
        </Link>
        .
      </Text>
    </>
  )
}
