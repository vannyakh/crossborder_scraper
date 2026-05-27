import { Box, Button, HStack, Input, NativeSelect, SimpleGrid, Tabs, Text, VStack } from '@chakra-ui/react'
import { Globe, List, RefreshCw, Shield, Waypoints } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { useProxyStatusQuery, useTestProxyMutation } from '../../hooks/queries/use-proxy-query'
import { fieldStyles } from '../ui/field-styles'
import { Section, SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import type { PanelSettingsForm } from './use-panel-settings-form'
import { SettingNotice, SettingRow, SettingsCard } from './panel-security-ui'
import { FormFieldsSkeleton, StatusStripSkeleton } from '../ui/PanelSkeleton'
import type { ProxyMode } from '../../lib/api/proxy-settings'

type ProxyTab = 'single' | 'pool' | 'vpn'

const MODE_LABELS: Record<ProxyMode, string> = {
  direct: 'Direct',
  single: 'Single proxy',
  pool: 'Rotating pool',
  vpn: 'VPN tunnel',
}

function modeTone(mode: ProxyMode): 'success' | 'danger' | 'neutral' | 'running' {
  if (mode === 'direct') return 'neutral'
  return 'success'
}

function ProxyStatusStrip({
  mode,
  poolSize,
  vpnEnabled,
  loading,
}: {
  mode?: ProxyMode
  poolSize?: number
  vpnEnabled?: boolean
  loading?: boolean
}) {
  if (loading) {
    return <StatusStripSkeleton items={3} />
  }

  return (
    <HStack
      gap={2}
      flexWrap="wrap"
      mb={4}
      px={3}
      py={2.5}
      borderRadius="var(--radius-input)"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.muted"
    >
      <StatusBadge
        status={mode ? modeTone(mode) : 'neutral'}
        label={mode ? MODE_LABELS[mode] : '—'}
      />
      {typeof poolSize === 'number' ? (
        <StatusBadge status={poolSize > 0 ? 'success' : 'neutral'} label={`${poolSize} active`} />
      ) : null}
      <StatusBadge
        status={vpnEnabled ? 'success' : 'neutral'}
        label={vpnEnabled ? 'VPN on' : 'VPN off'}
      />
    </HStack>
  )
}

export function ProxySettingsPanel({ form }: { form: PanelSettingsForm }) {
  const accentPalette = useAccentPalette()
  const statusQuery = useProxyStatusQuery(!form.isLoading)
  const testMutation = useTestProxyMutation()
  const status = statusQuery.data
  const test = testMutation.data
  const panel = form.panel

  if (form.isLoading) {
    return (
      <Section title="Proxy & egress" description="Route scrape traffic through HTTP/SOCKS proxies, rotating pools, or a VPN tunnel" mt={0}>
        <StatusStripSkeleton items={3} />
        <SectionCard>
          <FormFieldsSkeleton fields={4} />
        </SectionCard>
      </Section>
    )
  }

  const defaultTab: ProxyTab =
    status?.mode === 'pool'
      ? 'pool'
      : status?.mode === 'vpn' || form.vpnEnabled
        ? 'vpn'
        : 'single'

  return (
    <Section
      title="Proxy & egress"
      description="Route scrape traffic through HTTP/SOCKS proxies, rotating pools, or a VPN tunnel"
      mt={0}
    >
      <ProxyStatusStrip mode={status?.mode} poolSize={status?.pool_size} vpnEnabled={form.vpnEnabled} loading={statusQuery.isLoading} />

      <Tabs.Root defaultValue={defaultTab} variant="line" size="sm" mb={4}>
        <Tabs.List borderColor="border.subtle" flexWrap="wrap" gap={1}>
          <Tabs.Trigger value="single">HTTP / SOCKS</Tabs.Trigger>
          <Tabs.Trigger value="pool">Rotating pool</Tabs.Trigger>
          <Tabs.Trigger value="vpn">VPN</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="single" pt={4}>
          <SettingsCard icon={Globe} title="Single upstream proxy">
            <SettingRow
              label="Protocol"
              hint="Playwright supports HTTP, HTTPS, and SOCKS5 upstreams."
            >
              <NativeSelect.Root>
                <NativeSelect.Field
                  {...fieldStyles}
                  value={form.proxyParts.scheme}
                  onChange={(e) => form.setProxyScheme(e.target.value as 'http' | 'https' | 'socks5')}
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks5">SOCKS5</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </SettingRow>
            <SettingRow label="Host & port">
              <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                <Input
                  {...fieldStyles}
                  placeholder="proxy.example.com"
                  value={form.proxyParts.host}
                  onChange={(e) => form.patchProxyParts({ host: e.target.value })}
                />
                <Input
                  {...fieldStyles}
                  placeholder="8080"
                  value={form.proxyParts.port}
                  onChange={(e) => form.patchProxyParts({ port: e.target.value })}
                />
              </SimpleGrid>
            </SettingRow>
            <SettingRow
              label="Credentials"
              hint={
                panel?.proxy_server_set
                  ? `Current: ${panel.proxy_server_masked ?? 'set'} — re-enter to replace`
                  : 'Optional username and password'
              }
            >
              <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                <Input
                  {...fieldStyles}
                  placeholder="Username"
                  value={form.proxyParts.username}
                  onChange={(e) => form.patchProxyParts({ username: e.target.value })}
                  autoComplete="off"
                />
                <Input
                  {...fieldStyles}
                  type="password"
                  placeholder="Password"
                  value={form.proxyParts.password}
                  onChange={(e) => form.patchProxyParts({ password: e.target.value })}
                  autoComplete="new-password"
                />
              </SimpleGrid>
            </SettingRow>
            <SettingNotice>
              Used when no rotating pool file is configured. Pool file takes priority over single
              proxy and VPN.
            </SettingNotice>
          </SettingsCard>
        </Tabs.Content>

        <Tabs.Content value="pool" pt={4}>
          <SettingsCard icon={List} title="Rotating proxy pool">
            <SettingRow
              label="Proxy list file"
              hint="One proxy per line — overrides single proxy and VPN when the file has entries."
            >
              <Input
                {...fieldStyles}
                value={form.proxyListPath}
                onChange={(e) => form.setProxyListPath(e.target.value)}
                placeholder="config/proxies.txt"
                fontFamily="mono"
                fontSize="sm"
              />
            </SettingRow>
            <SettingRow label="Rotation strategy">
              <NativeSelect.Root>
                <NativeSelect.Field
                  {...fieldStyles}
                  value={form.proxyRotation}
                  onChange={(e) =>
                    form.setProxyRotation(e.target.value === 'random' ? 'random' : 'round_robin')
                  }
                >
                  <option value="round_robin">Round robin</option>
                  <option value="random">Random</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </SettingRow>
            <HStack gap={2} flexWrap="wrap" fontSize="xs" color="fg.subtle">
              <Text>
                File {status?.list_exists ? 'found' : 'missing'}
                {status?.list_exists ? ` · ${status.list_count} proxies loaded` : ''}
              </Text>
              <Button
                size="xs"
                variant="outline"
                borderColor="border.subtle"
                loading={statusQuery.isFetching}
                onClick={() => void statusQuery.refetch()}
              >
                <RefreshCw size={12} />
                Refresh
              </Button>
            </HStack>
          </SettingsCard>
        </Tabs.Content>

        <Tabs.Content value="vpn" pt={4}>
          <SettingsCard icon={Waypoints} title="VPN routing">
            <SettingRow
              label="Route scrape traffic through VPN"
              hint="Enable when a VPN client exposes a local SOCKS/HTTP port on this server."
            >
              <NativeSelect.Root>
                <NativeSelect.Field
                  {...fieldStyles}
                  value={form.vpnEnabled ? 'on' : 'off'}
                  onChange={(e) => form.setVpnEnabled(e.target.value === 'on')}
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </SettingRow>
            <SettingRow label="VPN type">
              <NativeSelect.Root>
                <NativeSelect.Field
                  {...fieldStyles}
                  value={form.vpnMode}
                  onChange={(e) =>
                    form.setVpnMode(e.target.value === 'wireguard' ? 'wireguard' : 'local_socks')
                  }
                >
                  <option value="local_socks">Local SOCKS / HTTP tunnel</option>
                  <option value="wireguard">WireGuard (config reference)</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </SettingRow>
            {form.vpnMode === 'local_socks' ? (
              <SettingRow
                label="Local endpoint"
                hint={
                  panel?.vpn_endpoint_set
                    ? `Current: ${panel.vpn_local_endpoint_masked ?? 'set'} — re-enter to replace`
                    : 'e.g. socks5://127.0.0.1:1080 from your VPN client'
                }
              >
                <Input
                  {...fieldStyles}
                  type="password"
                  placeholder="socks5://127.0.0.1:1080"
                  value={form.vpnLocalEndpoint}
                  onChange={(e) => form.setVpnLocalEndpoint(e.target.value)}
                  fontFamily="mono"
                  fontSize="sm"
                />
              </SettingRow>
            ) : (
              <SettingRow
                label="WireGuard config path"
                hint="Path to .conf on the VPS — start WireGuard outside the panel; scrapes use local endpoint when set."
              >
                <Input
                  {...fieldStyles}
                  placeholder="/etc/wireguard/wg0.conf"
                  value={form.vpnConfigPath}
                  onChange={(e) => form.setVpnConfigPath(e.target.value)}
                  fontFamily="mono"
                  fontSize="sm"
                />
              </SettingRow>
            )}
            <SettingNotice>
              Priority: rotating pool → VPN (when enabled) → single proxy → direct server IP. Run
              your VPN daemon separately; the panel only points Playwright at the local tunnel.
            </SettingNotice>
          </SettingsCard>
        </Tabs.Content>
      </Tabs.Root>

      <Box mt={2}>
        <SettingsCard icon={Shield} title="Egress security check">
          <HStack justify="space-between" mb={3} flexWrap="wrap" gap={2}>
            <Text fontSize="xs" color="fg.subtle">
              Compare server IP vs exit IP through the active proxy route
            </Text>
            <Button
              size="sm"
              colorPalette={accentPalette}
              loading={testMutation.isPending}
              onClick={() => void testMutation.mutate()}
            >
              Test egress
            </Button>
          </HStack>

          {test ? (
            <VStack align="stretch" gap={2}>
              <HStack gap={2} flexWrap="wrap">
                <StatusBadge
                  status={test.proxied ? 'success' : test.ok ? 'success' : 'danger'}
                  label={test.proxied ? 'IP hidden' : test.mode === 'direct' ? 'Direct' : 'Same IP'}
                />
                <StatusBadge status="neutral" label={MODE_LABELS[test.mode]} />
              </HStack>
              <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                <Box px={3} py={2} borderWidth="1px" borderColor="border.subtle" borderRadius="md">
                  <Text fontSize="xs" color="fg.muted" mb={1}>
                    Server IP
                  </Text>
                  <Text fontSize="sm" fontFamily="mono">
                    {test.direct_ip ?? '—'}
                  </Text>
                </Box>
                <Box px={3} py={2} borderWidth="1px" borderColor="border.subtle" borderRadius="md">
                  <Text fontSize="xs" color="fg.muted" mb={1}>
                    Exit IP
                  </Text>
                  <Text fontSize="sm" fontFamily="mono">
                    {test.exit_ip ?? '—'}
                  </Text>
                </Box>
              </SimpleGrid>
              <Text fontSize="sm" color={test.proxied ? 'fg.muted' : 'red.500'}>
                {test.message}
              </Text>
            </VStack>
          ) : (
            <Text fontSize="sm" color="fg.subtle">
              Save proxy settings, then run a test to confirm scrape traffic exits through the
              expected route.
            </Text>
          )}

          <SettingNotice>
            For panel login URLs, firewall, and entrance path, see{' '}
            <RouterLink to="/settings/network" style={{ color: 'var(--app-accent)' }}>
              Network & security
            </RouterLink>
            . Use the cloud security group there to restrict who can reach this host.
          </SettingNotice>
        </SettingsCard>
      </Box>
    </Section>
  )
}
