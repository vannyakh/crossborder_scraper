import {
  Box,
  Button,
  Code,
  Dialog,
  Field,
  Grid,
  HStack,
  Input,
  List,
  NativeSelect,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Copy, Eye, EyeOff, Globe, Lock, RefreshCw, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  applyHostFirewall,
  setupNetworkAccess,
  type NetworkAccessCheck,
} from '../../lib/api/network-access'
import {
  fetchPanelSecurity,
  updatePanelSecurity,
  type PanelSecurityStatus,
} from '../../lib/api/panel-security'
import { queryKeys } from '../../lib/api/query-keys'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { fieldStyles } from '../ui/field-styles'
import { Section } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import {
  InputWithAction,
  LinkCopyBlock,
  SettingNotice,
  SettingRow,
  SettingsCard,
} from './panel-security-ui'
import { NetworkSecuritySkeleton } from './panel-security-skeleton'

function checkTone(ok: boolean | null | undefined): 'success' | 'danger' | 'neutral' | 'running' {
  if (ok === true) return 'success'
  if (ok === false) return 'danger'
  return 'neutral'
}

function AccessCheckRow({ check }: { check: NetworkAccessCheck }) {
  return (
    <HStack justify="space-between" align="center" gap={3} py={2}>
      <Box flex={1} minW={0}>
        <Text fontSize="sm">{check.label}</Text>
        <Text fontSize="xs" color="fg.subtle" mt={0.5} lineClamp={2}>
          {check.detail}
        </Text>
      </Box>
      <StatusBadge
        status={checkTone(check.ok)}
        label={check.ok === true ? 'OK' : check.ok === false ? 'Fix' : 'Manual'}
      />
    </HStack>
  )
}

function StatusStrip({ data, networkReady }: { data: PanelSecurityStatus; networkReady: boolean }) {
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
        status={data.security_entrance_enabled ? 'success' : 'neutral'}
        label={data.security_entrance_enabled ? 'Entrance on' : 'Entrance off'}
      />
      <StatusBadge status="neutral" label={`Port ${data.panel_port}`} />
      <StatusBadge
        status={networkReady ? 'success' : 'running'}
        label={networkReady ? 'Network OK' : 'Check firewall'}
      />
    </HStack>
  )
}

export function PanelSecuritySection() {
  const accentPalette = useAccentPalette()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [domainDraft, setDomainDraft] = useState('')
  const [entryDraft, setEntryDraft] = useState('')
  const [userDraft, setUserDraft] = useState('')
  const [passDraft, setPassDraft] = useState('')
  const [timezoneDraft, setTimezoneDraft] = useState('UTC')
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)

  const securityQuery = useQuery({
    queryKey: queryKeys.panelSecurity,
    queryFn: fetchPanelSecurity,
    refetchInterval: 30_000,
  })

  const data = securityQuery.data
  const network = data?.network
  const networkReady = Boolean(network?.local_health && network?.public_bind)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.panelSecurity })
    void queryClient.invalidateQueries({ queryKey: queryKeys.networkAccess })
  }

  const updateMutation = useMutation({
    mutationFn: updatePanelSecurity,
    onSuccess: (res) => {
      setMessage(res.messages.join(' · '))
      if (res.access_key) {
        setRevealedKey(res.access_key)
        setShowKey(true)
      }
      if (res.restart_required) {
        setMessage((m) => `${m ?? ''} Restart the panel to apply.`.trim())
      }
      invalidate()
      setEntryDialogOpen(false)
      setAuthDialogOpen(false)
      setPassDraft('')
    },
    onError: (err: Error) => setMessage(err.message),
  })

  const applyMutation = useMutation({
    mutationFn: (enableUfw: boolean) => applyHostFirewall({ enable_ufw: enableUfw }),
    onSuccess: (res) => {
      setMessage(res.messages.join(' · ') || 'Firewall updated')
      invalidate()
    },
    onError: (err: Error) => setMessage(err.message),
  })

  const setupMutation = useMutation({
    mutationFn: () =>
      setupNetworkAccess({
        ensure_bind: true,
        enable_ufw: true,
        open_firewall: true,
        persist_external: true,
      }),
    onSuccess: (res) => {
      const extra = res.restart_required ? ' Restart the panel if bind changed.' : ''
      setMessage((res.messages.join(' · ') || 'Setup complete') + extra)
      invalidate()
    },
    onError: (err: Error) => setMessage(err.message),
  })

  useEffect(() => {
    if (data) setDomainDraft(data.external_host ?? '')
  }, [data?.external_host])

  useEffect(() => {
    if (data?.server_timezone?.timezone) {
      setTimezoneDraft(data.server_timezone.timezone)
    }
  }, [data?.server_timezone?.timezone])

  const ruleText = network?.cloud_rule
    ? `${network.cloud_rule.protocol} ${network.cloud_rule.port} · ${network.cloud_rule.source} · ${network.cloud_rule.action}`
    : ''

  const displayKey =
    revealedKey && showKey
      ? revealedKey
      : data?.access_key_configured
        ? '••••••••••••••••••••••••••••••••'
        : ''

  const openEntryDialog = (status: PanelSecurityStatus) => {
    setEntryDraft(status.entry_path ?? '')
    setEntryDialogOpen(true)
  }

  const openAuthDialog = (status: PanelSecurityStatus) => {
    setUserDraft(status.panel_username ?? '')
    setPassDraft('')
    setAuthDialogOpen(true)
  }

  return (
    <Section title="Network & security" description="Access URLs, login, and firewall" mt={0}>
      {securityQuery.isLoading ? (
        <NetworkSecuritySkeleton />
      ) : securityQuery.isError ? (
        <SettingNotice>
          Could not load settings. {String(securityQuery.error)} Restart the panel after updating
          server code.
        </SettingNotice>
      ) : data ? (
        <>
          <StatusStrip data={data} networkReady={networkReady} />

          <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
            <SettingsCard icon={Globe} title="Access">
              <SettingRow
                label="Public domain or IP"
                hint="Shown in the sidebar access card and login links."
              >
                <InputWithAction
                  value={domainDraft || data.external_host || ''}
                  placeholder="203.0.113.10"
                  actionLabel="Save"
                  actionLoading={updateMutation.isPending}
                  onChange={setDomainDraft}
                  onAction={() =>
                    void updateMutation.mutate({ external_host: domainDraft.trim() || '' })
                  }
                />
              </SettingRow>

              <SettingRow
                label="Panel port"
                hint={`Listening on ${data.panel_host}. Change in .env, then restart.`}
              >
                <InputWithAction
                  value={String(data.panel_port)}
                  readOnly
                  disabled
                  mono
                  actionLabel="Modify"
                  actionVariant="outline"
                  actionDisabled
                />
              </SettingRow>

              <SettingRow
                label="Security entrance"
                hint={
                  data.security_entrance_enabled
                    ? 'Login only works through the entrance URL below.'
                    : 'Recommended on VPS — hides the panel behind a secret path.'
                }
              >
                <InputWithAction
                  value={data.entry_path_display ?? 'Off'}
                  readOnly
                  disabled
                  mono
                  actionLabel="Modify"
                  actionVariant="outline"
                  onAction={() => openEntryDialog(data)}
                />
              </SettingRow>

              <SettingRow
                label="Access key"
                hint="Required with entrance enabled. Resetting invalidates old bookmarks."
              >
                <HStack gap={2} flexWrap="wrap">
                  <Input
                    {...fieldStyles}
                    flex={1}
                    minW="10rem"
                    fontSize="sm"
                    fontFamily="mono"
                    type={showKey && revealedKey ? 'text' : 'password'}
                    value={displayKey}
                    readOnly
                    disabled
                    placeholder={data.access_key_configured ? undefined : 'Not set'}
                  />
                  {(data.access_key_configured || revealedKey) && (
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="border.subtle"
                      aria-label={showKey ? 'Hide key' : 'Show key'}
                      onClick={() => setShowKey((v) => !v)}
                      disabled={!revealedKey}
                    >
                      {showKey && revealedKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="border.subtle"
                    disabled={!revealedKey}
                    aria-label="Copy access key"
                    onClick={() => {
                      if (revealedKey) void navigator.clipboard.writeText(revealedKey)
                    }}
                  >
                    <Copy size={14} />
                  </Button>
                  <Button
                    size="sm"
                    colorPalette={accentPalette}
                    loading={updateMutation.isPending}
                    onClick={() => void updateMutation.mutate({ regenerate_access_key: true })}
                  >
                    Reset
                  </Button>
                </HStack>
              </SettingRow>

              {(data.urls.entrance || data.urls.login) && (
                <Box pt={1}>
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color="fg.muted"
                    mb={2.5}
                    textTransform="uppercase"
                    letterSpacing="0.04em"
                  >
                    Your links
                  </Text>
                  <VStack align="stretch" gap={2.5}>
                    <LinkCopyBlock label="Entrance" url={data.urls.entrance} />
                    <LinkCopyBlock label="Login" url={data.urls.login} />
                  </VStack>
                </Box>
              )}
            </SettingsCard>

            <SettingsCard icon={Lock} title="Login">
              <SettingRow label="Username">
                <InputWithAction
                  value={data.panel_username ?? '—'}
                  readOnly
                  disabled
                  actionLabel="Change"
                  actionVariant="outline"
                  onAction={() => openAuthDialog(data)}
                />
              </SettingRow>
              <SettingRow label="Password" hint="Stored in server .env">
                <InputWithAction
                  value="••••••••"
                  readOnly
                  disabled
                  type="password"
                  actionLabel="Change"
                  actionVariant="outline"
                  onAction={() => openAuthDialog(data)}
                />
              </SettingRow>
              <SettingNotice>
                For HTTPS in production, put a reverse proxy in front of the panel. CLI:{' '}
                <Code fontSize="xs">crossborder deploy nginx -n your.domain.com</Code>
              </SettingNotice>
            </SettingsCard>

            <SettingsCard icon={Clock} title="Server time">
              <SettingRow
                label="Timezone"
                hint="Cron schedules run in this timezone. Stored in panel config."
              >
                <HStack gap={2} flexWrap="wrap" align="flex-start">
                  <NativeSelect.Root {...fieldStyles} flex={1} minW="12rem">
                    <NativeSelect.Field
                      value={timezoneDraft}
                      onChange={(e) => setTimezoneDraft(e.target.value)}
                    >
                      {data.timezone_options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label} ({opt.id})
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                  <Button
                    size="sm"
                    colorPalette={accentPalette}
                    loading={updateMutation.isPending}
                    onClick={() => void updateMutation.mutate({ timezone: timezoneDraft })}
                  >
                    Save
                  </Button>
                </HStack>
              </SettingRow>
              <SettingRow label="Local time" hint={`UTC offset ${data.server_timezone.utc_offset}`}>
                <Text fontSize="sm" fontFamily="mono">
                  {data.server_timezone.local_time || '—'}
                </Text>
              </SettingRow>
            </SettingsCard>

            <Grid gridColumn={{ xl: '1 / -1' }}>
              <SettingsCard icon={Shield} title="Firewall">
                <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
                  <Text fontSize="xs" color="fg.subtle">
                    Host ufw / firewalld and cloud security group
                  </Text>
                  <HStack gap={2} flexWrap="wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="border.subtle"
                      onClick={() => void securityQuery.refetch()}
                      loading={securityQuery.isFetching}
                    >
                      <RefreshCw size={14} />
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="border.subtle"
                      loading={applyMutation.isPending}
                      disabled={!network?.can_manage_host_firewall}
                      onClick={() => void applyMutation.mutate(false)}
                    >
                      Open port
                    </Button>
                    <Button
                      size="sm"
                      colorPalette={accentPalette}
                      loading={setupMutation.isPending}
                      onClick={() => void setupMutation.mutate()}
                    >
                      Auto setup
                    </Button>
                  </HStack>
                </HStack>

                {network ? (
                  <VStack align="stretch" gap={4}>
                    <Box borderTopWidth="1px" borderColor="border.muted" pt={1}>
                      {network.checks.map((check) => (
                        <AccessCheckRow key={check.id} check={check} />
                      ))}
                    </Box>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={2}>
                        Cloud security group
                      </Text>
                      <HStack gap={2} mb={2}>
                        <Code fontSize="xs" flex={1} px={2.5} py={1.5} borderRadius="md">
                          {ruleText || '—'}
                        </Code>
                        <Button
                          size="xs"
                          variant="outline"
                          borderColor="border.subtle"
                          disabled={!ruleText}
                          onClick={() => {
                            if (ruleText) void navigator.clipboard.writeText(ruleText)
                          }}
                        >
                          Copy
                        </Button>
                      </HStack>
                      <List.Root fontSize="xs" color="fg.subtle" gap={1.5} ml={4}>
                        {network.cloud_steps.map((step) => (
                          <List.Item key={step}>{step}</List.Item>
                        ))}
                      </List.Root>
                    </Box>
                  </VStack>
                ) : null}
              </SettingsCard>
            </Grid>
          </SimpleGrid>
        </>
      ) : null}

      {message ? (
        <Box
          mt={4}
          px={3}
          py={2}
          borderRadius="md"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.muted"
        >
          <Text fontSize="sm" color="fg.muted">
            {message}
          </Text>
        </Box>
      ) : null}

      <Dialog.Root
        open={entryDialogOpen}
        onOpenChange={(e) => !e.open && setEntryDialogOpen(false)}
        lazyMount
        unmountOnExit
      >
        <Dialog.Backdrop />
        <Dialog.Positioner display="flex" alignItems="center" justifyContent="center" p={4}>
          <Dialog.Content maxW="md">
            <Dialog.Header>
              <Dialog.Title>Security entrance</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Field.Root>
                <Field.Label fontSize="sm">Path (8 hex characters)</Field.Label>
                <Input
                  {...fieldStyles}
                  fontFamily="mono"
                  placeholder="a1b2c3d4"
                  value={entryDraft}
                  onChange={(e) =>
                    setEntryDraft(e.target.value.replace(/[^a-fA-F0-9]/g, '').slice(0, 8))
                  }
                />
                <Field.HelperText fontSize="xs">
                  Or tap Regenerate for a random path.
                </Field.HelperText>
              </Field.Root>
            </Dialog.Body>
            <Dialog.Footer gap={2}>
              <Button
                variant="outline"
                onClick={() =>
                  void updateMutation.mutate({ enable_entrance: false, entry_path: 'off' })
                }
              >
                Turn off
              </Button>
              <Button
                variant="outline"
                loading={updateMutation.isPending}
                onClick={() => void updateMutation.mutate({ regenerate_entry: true })}
              >
                Regenerate
              </Button>
              <Button
                colorPalette={accentPalette}
                loading={updateMutation.isPending}
                onClick={() =>
                  void updateMutation.mutate({
                    entry_path: entryDraft.trim() || undefined,
                    enable_entrance: entryDraft.trim() ? true : undefined,
                  })
                }
              >
                Save
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root
        open={authDialogOpen}
        onOpenChange={(e) => !e.open && setAuthDialogOpen(false)}
        lazyMount
        unmountOnExit
      >
        <Dialog.Backdrop />
        <Dialog.Positioner display="flex" alignItems="center" justifyContent="center" p={4}>
          <Dialog.Content maxW="md">
            <Dialog.Header>
              <Dialog.Title>Change login</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap={4}>
                <Field.Root>
                  <Field.Label fontSize="sm">Username</Field.Label>
                  <Input
                    {...fieldStyles}
                    value={userDraft}
                    onChange={(e) => setUserDraft(e.target.value)}
                    autoComplete="username"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label fontSize="sm">New password</Field.Label>
                  <Input
                    {...fieldStyles}
                    type="password"
                    value={passDraft}
                    onChange={(e) => setPassDraft(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters — leave blank to keep"
                  />
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                colorPalette={accentPalette}
                loading={updateMutation.isPending}
                onClick={() => {
                  const body: Parameters<typeof updatePanelSecurity>[0] = {}
                  if (userDraft.trim()) body.username = userDraft.trim()
                  if (passDraft) body.password = passDraft
                  if (!body.username && !body.password) {
                    setMessage('Enter a username or new password')
                    return
                  }
                  void updateMutation.mutate(body)
                }}
              >
                Save
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Section>
  )
}
