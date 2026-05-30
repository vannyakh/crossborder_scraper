import {
  Box,
  Button,
  Dialog,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Portal,
  Switch,
  Text,
} from '@chakra-ui/react'
import { Globe, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useCreateVhostSiteMutation,
  useDeleteVhostSiteMutation,
  useInstallNginxMutation,
  useReloadVhostNginxMutation,
  useToggleVhostSiteMutation,
  useVhostCertbotMutation,
  useVhostSitesQuery,
  useVhostStatusQuery,
} from '../../hooks/queries/use-vhost-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { VhostSite } from '../../lib/api'
import { settingsPath } from '../../routes/route-config'
import { Toolbar } from '../layout/Toolbar'
import { DataListEmpty } from '../ui/DataList'
import { SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <Box
      p={3}
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-card)"
      bg="bg.panelHover"
      minW="100px"
    >
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="lg" fontWeight="semibold" mt={0.5}>
        {value}
      </Text>
    </Box>
  )
}

function AddSiteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accentPalette = useAccentPalette()
  const createMutation = useCreateVhostSiteMutation()
  const statusQuery = useVhostStatusQuery()
  const panelPort = statusQuery.data?.panel_port ?? 8787
  const [domain, setDomain] = useState('')
  const [upstreamPort, setUpstreamPort] = useState(String(panelPort))
  const [certbot, setCertbot] = useState(true)
  const [ssl, setSsl] = useState(false)
  const [remark, setRemark] = useState('')
  const [purpose, setPurpose] = useState<'panel' | 'proxy' | 'other'>('panel')

  useEffect(() => {
    setUpstreamPort(String(panelPort))
  }, [panelPort])

  async function submit() {
    const result = await createMutation.mutateAsync({
      domain: domain.trim(),
      upstream_port: Number(upstreamPort) || 8787,
      certbot,
      ssl: ssl && !certbot,
      remark: remark.trim(),
      purpose,
    })
    if (result.ok) {
      onClose()
      setDomain('')
      setRemark('')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner display="flex" alignItems="center" justifyContent="center" p={4}>
          <Dialog.Content maxW="520px" w="full" bg="bg.elevated">
            <Dialog.Header borderBottomWidth="1px" borderColor="border.subtle">
              <Dialog.Title fontWeight="semibold">Add reverse proxy site</Dialog.Title>
              <Dialog.Description fontSize="sm" color="fg.muted" mt={1}>
                nginx terminates HTTP/HTTPS and forwards to a local upstream port.
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body py={4}>
              <Grid gap={3}>
                <Field.Root required>
                  <Field.Label>Domain</Field.Label>
                  <Input
                    value={domain}
                    placeholder="panel.example.com"
                    onChange={(e) => setDomain(e.target.value)}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Upstream port</Field.Label>
                  <Input
                    value={upstreamPort}
                    placeholder="8787"
                    onChange={(e) => setUpstreamPort(e.target.value)}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Purpose</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value as typeof purpose)}
                    >
                      <option value="panel">Panel</option>
                      <option value="proxy">Proxy</option>
                      <option value="other">Other</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Remark</Field.Label>
                  <Input
                    value={remark}
                    placeholder="Optional note"
                    onChange={(e) => setRemark(e.target.value)}
                  />
                </Field.Root>
                <HStack justify="space-between">
                  <Text fontSize="sm">Request Let&apos;s Encrypt (certbot)</Text>
                  <Switch.Root
                    checked={certbot}
                    onCheckedChange={(e) => {
                      setCertbot(e.checked)
                      if (e.checked) setSsl(false)
                    }}
                    colorPalette={accentPalette}
                  >
                    <Switch.HiddenInput />
                    <Switch.Control />
                  </Switch.Root>
                </HStack>
                {!certbot ? (
                  <HStack justify="space-between">
                    <Text fontSize="sm">Use existing TLS certificate paths</Text>
                    <Switch.Root
                      checked={ssl}
                      onCheckedChange={(e) => setSsl(e.checked)}
                      colorPalette={accentPalette}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                    </Switch.Root>
                  </HStack>
                ) : null}
              </Grid>
              {createMutation.data?.warnings?.length ? (
                <Text mt={3} fontSize="xs" color="orange.400" whiteSpace="pre-wrap">
                  {createMutation.data.warnings.join('\n')}
                </Text>
              ) : null}
              {createMutation.data?.login_url ? (
                <Text mt={2} fontSize="xs" color="fg.muted">
                  Login URL: {createMutation.data.login_url}
                </Text>
              ) : null}
            </Dialog.Body>
            <Dialog.Footer borderTopWidth="1px" borderColor="border.subtle" gap={2}>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorPalette={accentPalette}
                loading={createMutation.isPending}
                disabled={!domain.trim()}
                onClick={() => void submit()}
              >
                Create site
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

function SiteRow({ site, onRefresh }: { site: VhostSite; onRefresh: () => void }) {
  const toggleMutation = useToggleVhostSiteMutation()
  const deleteMutation = useDeleteVhostSiteMutation()
  const certbotMutation = useVhostCertbotMutation()
  const domain = site.server_names[0] ?? site.id
  const busy = toggleMutation.isPending || deleteMutation.isPending || certbotMutation.isPending

  return (
    <Box
      p={3}
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-card)"
      bg="bg.panelHover"
    >
      <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
        <Box flex="1" minW="200px">
          <HStack gap={2} mb={1}>
            <Text fontWeight="semibold">{domain}</Text>
            <StatusBadge
              status={site.enabled ? 'success' : 'neutral'}
              label={site.enabled ? 'enabled' : 'disabled'}
            />
            {site.ssl ? <StatusBadge status="running" label="TLS" /> : null}
            {site.enabled && site.upstream_healthy === false ? (
              <StatusBadge status="danger" label="502 risk" />
            ) : null}
          </HStack>
          <Text fontSize="xs" color="fg.muted" fontFamily="mono">
            → 127.0.0.1:{site.upstream_port ?? '—'}
            {site.upstream_healthy === false ? ' (upstream down)' : ''} · {site.filename}
          </Text>
          {site.remark ? (
            <Text fontSize="xs" color="fg.muted" mt={1}>
              {site.remark}
            </Text>
          ) : null}
        </Box>
        <HStack gap={2} flexWrap="wrap">
          {!site.ssl && site.enabled ? (
            <Button
              size="xs"
              variant="outline"
              loading={certbotMutation.isPending}
              onClick={() => void certbotMutation.mutateAsync(domain).then(() => onRefresh())}
            >
              <ShieldCheck size={14} />
              TLS
            </Button>
          ) : null}
          <Button
            size="xs"
            variant="outline"
            loading={busy}
            onClick={() => {
              if (
                site.enabled &&
                site.purpose === 'panel' &&
                !window.confirm(
                  `Disable panel vhost ${domain}? Public URL will return 502 Bad Gateway until re-enabled.`,
                )
              ) {
                return
              }
              void toggleMutation
                .mutateAsync({ siteId: site.id, enabled: !site.enabled })
                .then(() => onRefresh())
            }}
          >
            {site.enabled ? 'Disable' : 'Enable'}
          </Button>
          {site.managed ? (
            <Button
              size="xs"
              variant="outline"
              colorPalette="red"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm(`Remove nginx site ${domain}?`)) {
                  void deleteMutation.mutateAsync(site.id).then(() => onRefresh())
                }
              }}
            >
              <Trash2 size={14} />
            </Button>
          ) : null}
        </HStack>
      </HStack>
    </Box>
  )
}

export function VhostPanels() {
  const accentPalette = useAccentPalette()
  const statusQuery = useVhostStatusQuery()
  const sitesQuery = useVhostSitesQuery()
  const reloadMutation = useReloadVhostNginxMutation()
  const installMutation = useInstallNginxMutation()
  const [addOpen, setAddOpen] = useState(false)

  const status = statusQuery.data
  const sites = sitesQuery.data?.items ?? []
  const refreshing = statusQuery.isFetching || sitesQuery.isFetching

  function refresh() {
    void statusQuery.refetch()
    void sitesQuery.refetch()
  }

  return (
    <Box>
      <Toolbar
        title="Virtual hosts"
        description="nginx reverse proxy sites for the panel and upstream services"
        actions={
          <HStack gap={2}>
            <Button size="sm" variant="ghost" onClick={refresh} loading={refreshing}>
              <RefreshCw size={16} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={reloadMutation.isPending}
              disabled={!status?.installed}
              onClick={() => void reloadMutation.mutateAsync()}
            >
              Reload nginx
            </Button>
            <Button size="sm" colorPalette={accentPalette} onClick={() => setAddOpen(true)}>
              <Plus size={16} />
              Add site
            </Button>
          </HStack>
        }
      />

      {!status?.installed ? (
        <SectionCard mb={4} p={4} borderColor="orange.500">
          <HStack justify="space-between" flexWrap="wrap" gap={3}>
            <Text fontSize="sm">
              nginx is not installed on this host. Install nginx to manage virtual hosts from the
              panel.
            </Text>
            <Button
              size="sm"
              colorPalette={accentPalette}
              loading={installMutation.isPending}
              onClick={() => void installMutation.mutateAsync()}
            >
              Install nginx
            </Button>
          </HStack>
        </SectionCard>
      ) : null}

      {status && status.panel_upstream_healthy === false ? (
        <SectionCard mb={4} p={4} borderColor="orange.500">
          <Text fontSize="sm">
            Panel upstream on 127.0.0.1:{status.panel_port} is not responding. Enabled nginx sites
            will return 502 Bad Gateway until the panel service is running on that port.
          </Text>
        </SectionCard>
      ) : null}

      {status && !status.can_manage ? (
        <SectionCard mb={4} p={4}>
          <Text fontSize="sm" color="fg.muted">
            nginx is installed but the panel cannot manage sites without root or passwordless sudo.
            Use{' '}
            <Link to={settingsPath('network')} style={{ textDecoration: 'underline' }}>
              Network settings
            </Link>{' '}
            or run deploy commands on the VPS.
          </Text>
        </SectionCard>
      ) : null}

      <SectionCard mb={4} p={4}>
        <HStack gap={2} mb={3}>
          <Globe size={18} />
          <Text fontWeight="semibold">Host summary</Text>
          {status ? (
            <StatusBadge
              status={status.installed ? 'success' : 'danger'}
              label={status.installed ? 'nginx installed' : 'not installed'}
            />
          ) : null}
        </HStack>
        <HStack gap={3} flexWrap="wrap">
          <StatBox label="Sites" value={status?.site_count ?? '—'} />
          <StatBox label="Enabled" value={status?.enabled_count ?? '—'} />
          <StatBox label="TLS" value={status?.ssl_count ?? '—'} />
          <StatBox label="502 risk" value={status?.unhealthy_count ?? '—'} />
          <StatBox label="certbot" value={status?.certbot_installed ? 'yes' : 'no'} />
        </HStack>
        {status?.sites_available_dir ? (
          <Text mt={3} fontSize="xs" color="fg.muted" fontFamily="mono">
            {status.sites_available_dir}
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard p={4}>
        <Text fontWeight="semibold" mb={3}>
          Sites
        </Text>
        {sites.length === 0 ? (
          <DataListEmpty>
            No nginx sites. Add a reverse proxy site to put TLS in front of the panel on port 8787.
          </DataListEmpty>
        ) : (
          <Grid gap={3}>
            {sites.map((site) => (
              <SiteRow key={site.id} site={site} onRefresh={refresh} />
            ))}
          </Grid>
        )}
      </SectionCard>

      <AddSiteDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </Box>
  )
}
