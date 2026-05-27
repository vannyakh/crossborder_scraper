import {
  Box,
  Button,
  Code,
  Dialog,
  Field,
  HStack,
  Input,
  List,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Copy,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  RefreshCw,
  Shield,
} from 'lucide-react'
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
import { fieldStyles } from '../ui/field-styles'
import { Section, SectionCard, SubtitleText } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'

function checkTone(ok: boolean | null | undefined): 'success' | 'danger' | 'neutral' | 'running' {
  if (ok === true) return 'success'
  if (ok === false) return 'danger'
  return 'neutral'
}

function AccessCheckRow({ check }: { check: NetworkAccessCheck }) {
  return (
    <HStack justify="space-between" align="flex-start" gap={4} py={2}>
      <Box flex={1} minW={0}>
        <Text fontSize="sm" fontWeight="medium">
          {check.label}
        </Text>
        <Text fontSize="xs" color="fg.muted" mt={0.5}>
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

function ConfigRow({
  label,
  description,
  value,
  children,
}: {
  label: string
  description?: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <Box py={3} borderTopWidth="1px" borderColor="border.muted" _first={{ borderTopWidth: 0, pt: 0 }}>
      <Text fontSize="sm" fontWeight="medium">
        {label}
        {description ? (
          <Text as="span" fontWeight="normal" color="fg.muted">
            {' '}
            — {description}
          </Text>
        ) : null}
      </Text>
      <HStack mt={2} gap={2} flexWrap="wrap" align="flex-start">
        {value !== undefined ? (
          <Input {...fieldStyles} flex={1} minW="12rem" value={value} readOnly disabled />
        ) : null}
        {children}
      </HStack>
    </Box>
  )
}

function AlertHint({ children }: { children: React.ReactNode }) {
  return (
    <HStack
      mt={2}
      gap={2}
      px={3}
      py={2}
      borderRadius="md"
      bg="bg.muted"
      borderWidth="1px"
      borderColor="border.muted"
      align="flex-start"
    >
      <Shield size={14} style={{ flexShrink: 0, marginTop: 2 }} />
      <Text fontSize="xs" color="fg.muted">
        {children}
      </Text>
    </HStack>
  )
}

function UrlCopyRow({ label, url }: { label: string; url: string | null }) {
  if (!url) return null
  return (
    <Box>
      <Text fontSize="xs" color="fg.muted" mb={1}>
        {label}
      </Text>
      <HStack gap={2}>
        <Code fontSize="xs" flex={1} px={2} py={1} borderRadius="md" wordBreak="break-all">
          {url}
        </Code>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => void navigator.clipboard.writeText(url)}
          aria-label={`Copy ${label}`}
        >
          <Copy size={14} />
        </Button>
      </HStack>
    </Box>
  )
}

export function PanelSecuritySection() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  const [domainDraft, setDomainDraft] = useState('')
  const [entryDraft, setEntryDraft] = useState('')
  const [userDraft, setUserDraft] = useState('')
  const [passDraft, setPassDraft] = useState('')

  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)

  const securityQuery = useQuery({
    queryKey: queryKeys.panelSecurity,
    queryFn: fetchPanelSecurity,
    refetchInterval: 30_000,
  })

  const data = securityQuery.data

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
      setMessage(res.messages.join(' · ') || 'Host firewall updated')
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

  const openEntryDialog = (status: PanelSecurityStatus) => {
    setEntryDraft(status.entry_path ?? '')
    setEntryDialogOpen(true)
  }

  const openAuthDialog = (status: PanelSecurityStatus) => {
    setUserDraft(status.panel_username ?? '')
    setPassDraft('')
    setAuthDialogOpen(true)
  }

  useEffect(() => {
    if (data) {
      setDomainDraft(data.external_host ?? '')
    }
  }, [data?.external_host])

  const network = data?.network
  const rule = network?.cloud_rule
  const ruleText = rule
    ? `${rule.direction} · ${rule.protocol} ${rule.port} · ${rule.source} · ${rule.action}`
    : ''

  const displayKey =
    revealedKey && showKey
      ? revealedKey
      : data?.access_key_configured
        ? '••••••••••••••••••••••••••••••••'
        : ''

  return (
    <Section
      title="Network & security"
      description="Domain, panel port, security entrance, login credentials, and firewall"
      mt={0}
    >
      <VStack align="stretch" gap={4}>
        <SectionCard>
          <HStack gap={2} mb={2}>
            <Globe size={18} />
            <Text fontSize="sm" fontWeight="semibold">
              Network & access
            </Text>
          </HStack>
          <SubtitleText mb={4}>Configure panel network settings and access URLs</SubtitleText>

          {securityQuery.isLoading ? (
            <Text fontSize="sm" color="fg.muted">
              Loading…
            </Text>
          ) : securityQuery.isError ? (
            <Text fontSize="sm" color="red.500">
              {String(securityQuery.error)}
            </Text>
          ) : data ? (
            <>
              <ConfigRow
                label="Public domain or IP"
                description="Used in access card and login URLs"
              >
                <Input
                  {...fieldStyles}
                  flex={1}
                  minW="12rem"
                  placeholder="Optional — e.g. 203.0.113.10 or panel.example.com"
                  value={domainDraft || data.external_host || ''}
                  onChange={(e) => setDomainDraft(e.target.value)}
                />
                <Button
                  size="sm"
                  colorPalette="blue"
                  loading={updateMutation.isPending}
                  onClick={() =>
                    void updateMutation.mutate({
                      external_host: domainDraft.trim() || '',
                    })
                  }
                >
                  Save
                </Button>
              </ConfigRow>
              <AlertHint>
                After setting, prefer opening the panel via the entrance or login URL below, not
                bare IP:port.
              </AlertHint>

              <ConfigRow
                label="Panel port"
                description={`Suggested: 8787–65535 · bind ${data.panel_host}`}
                value={String(data.panel_port)}
              >
                <Button size="sm" variant="outline" disabled title="Change in .env and restart">
                  Modify
                </Button>
              </ConfigRow>
              <AlertHint>
                If using a cloud security group, allow inbound TCP on this port after changing it.
              </AlertHint>

              <ConfigRow
                label="Security entrance"
                description="Secret path prefix — panel admin entry"
                value={data.entry_path_display ?? 'Disabled'}
              >
                <Button size="sm" colorPalette="blue" onClick={() => openEntryDialog(data)}>
                  Modify
                </Button>
              </ConfigRow>
              <AlertHint>
                {data.security_entrance_enabled
                  ? 'Only login via the specified entrance path. Bare http://host:port returns 404.'
                  : 'Enable to hide the panel behind a random URL path (recommended on VPS).'}
              </AlertHint>

              <ConfigRow label="Access key" description="Required before login when entrance is on">
                <Input
                  {...fieldStyles}
                  flex={1}
                  minW="12rem"
                  type={showKey && revealedKey ? 'text' : 'password'}
                  value={displayKey}
                  readOnly
                  disabled
                />
                {data.access_key_configured || revealedKey ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowKey((v) => !v)}
                    disabled={!revealedKey}
                    title={revealedKey ? undefined : 'Regenerate to reveal a new key'}
                  >
                    {showKey && revealedKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!revealedKey}
                  onClick={() => {
                    if (revealedKey) void navigator.clipboard.writeText(revealedKey)
                  }}
                >
                  <Copy size={14} />
                </Button>
                <Button
                  size="sm"
                  colorPalette="blue"
                  loading={updateMutation.isPending}
                  onClick={() => void updateMutation.mutate({ regenerate_access_key: true })}
                >
                  Reset key
                </Button>
              </ConfigRow>
              <AlertHint>Keep your access key private. Reset invalidates old login links.</AlertHint>

              <VStack align="stretch" gap={3} mt={4} pt={3} borderTopWidth="1px" borderColor="border.muted">
                <UrlCopyRow label="Entrance URL" url={data.urls.entrance} />
                <UrlCopyRow label="Login URL" url={data.urls.login} />
                <Text fontSize="xs" color="fg.subtle">
                  {data.urls.bare_host_note}
                </Text>
              </VStack>
            </>
          ) : null}
        </SectionCard>

        <SectionCard>
          <HStack gap={2} mb={2}>
            <Lock size={18} />
            <Text fontSize="sm" fontWeight="semibold">
              Authentication
            </Text>
          </HStack>
          <SubtitleText mb={4}>Panel login username and password (.env)</SubtitleText>

          {data ? (
            <>
              <ConfigRow label="Panel user" description="HTTP Basic / login username" value={data.panel_username ?? ''}>
                <Button size="sm" colorPalette="blue" onClick={() => openAuthDialog(data)}>
                  Modify
                </Button>
              </ConfigRow>
              <ConfigRow label="Panel password" description="Stored in .env on the server" value="********">
                <Button size="sm" colorPalette="blue" onClick={() => openAuthDialog(data)}>
                  Modify
                </Button>
              </ConfigRow>
            </>
          ) : null}
        </SectionCard>

        <SectionCard>
          <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
            <HStack gap={2}>
              <Shield size={18} />
              <Text fontSize="sm" fontWeight="semibold">
                Host firewall & cloud
              </Text>
              {network ? (
                <StatusBadge
                  status={network.local_health && network.public_bind ? 'success' : 'running'}
                  label={`:${network.port}`}
                />
              ) : null}
            </HStack>
            <HStack gap={2}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void securityQuery.refetch()}
                loading={securityQuery.isFetching}
              >
                <RefreshCw size={14} />
                Refresh
              </Button>
              <Button
                size="sm"
                variant="outline"
                loading={applyMutation.isPending}
                disabled={!network?.can_manage_host_firewall}
                onClick={() => void applyMutation.mutate(false)}
              >
                Open port (ufw)
              </Button>
              <Button
                size="sm"
                colorPalette="blue"
                loading={setupMutation.isPending}
                onClick={() => void setupMutation.mutate()}
              >
                Full setup
              </Button>
            </HStack>
          </HStack>

          {network ? (
            <VStack align="stretch" gap={4}>
              <Box borderTopWidth="1px" borderColor="border.muted" pt={2}>
                {network.checks.map((check) => (
                  <AccessCheckRow key={check.id} check={check} />
                ))}
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                  Cloud security group (inbound)
                </Text>
                <HStack gap={2} mb={2}>
                  <Code fontSize="xs" flex={1} px={2} py={1}>
                    {ruleText}
                  </Code>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      if (ruleText) void navigator.clipboard.writeText(ruleText)
                    }}
                  >
                    <Copy size={14} />
                  </Button>
                </HStack>
                <List.Root fontSize="xs" color="fg.muted" gap={1} ml={4}>
                  {network.cloud_steps.map((step) => (
                    <List.Item key={step}>{step}</List.Item>
                  ))}
                </List.Root>
              </Box>
            </VStack>
          ) : null}
        </SectionCard>

        <SectionCard>
          <HStack gap={2} mb={2}>
            <KeyRound size={18} />
            <Text fontSize="sm" fontWeight="semibold">
              HTTPS (production)
            </Text>
          </HStack>
          <SubtitleText>
            Put nginx or another reverse proxy in front for TLS. CLI:{' '}
            <Code fontSize="xs">crossborder deploy nginx -n your.domain.com</Code>
          </SubtitleText>
        </SectionCard>

        {message ? (
          <Text fontSize="xs" color="fg.muted" px={1}>
            {message}
          </Text>
        ) : null}
      </VStack>

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
                <Field.Label fontSize="xs">Entrance path (8 hex chars, without slashes)</Field.Label>
                <Input
                  {...fieldStyles}
                  placeholder="a1b2c3d4"
                  value={entryDraft}
                  onChange={(e) => setEntryDraft(e.target.value.replace(/[^a-fA-F0-9]/g, '').slice(0, 8))}
                />
                <Field.HelperText fontSize="xs">
                  Or leave empty and use Regenerate for a random path
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
                Disable
              </Button>
              <Button
                variant="outline"
                loading={updateMutation.isPending}
                onClick={() => void updateMutation.mutate({ regenerate_entry: true })}
              >
                Regenerate
              </Button>
              <Button
                colorPalette="blue"
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
              <Dialog.Title>Panel credentials</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap={4}>
                <Field.Root>
                  <Field.Label fontSize="xs">Username</Field.Label>
                  <Input
                    {...fieldStyles}
                    value={userDraft}
                    onChange={(e) => setUserDraft(e.target.value)}
                    autoComplete="username"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label fontSize="xs">New password (min 8 characters)</Field.Label>
                  <Input
                    {...fieldStyles}
                    type="password"
                    value={passDraft}
                    onChange={(e) => setPassDraft(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Leave blank to keep current"
                  />
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                colorPalette="blue"
                loading={updateMutation.isPending}
                onClick={() => {
                  const body: Parameters<typeof updatePanelSecurity>[0] = {}
                  if (userDraft.trim()) body.username = userDraft.trim()
                  if (passDraft) body.password = passDraft
                  if (!body.username && !body.password) {
                    setMessage('Enter a username and/or new password')
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
