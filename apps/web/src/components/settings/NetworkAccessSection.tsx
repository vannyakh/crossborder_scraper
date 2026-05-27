import {
  Box,
  Button,
  Code,
  HStack,
  List,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, RefreshCw, Shield } from 'lucide-react'
import { useState } from 'react'
import {
  applyHostFirewall,
  fetchNetworkAccess,
  setupNetworkAccess,
  type NetworkAccessCheck,
} from '../../lib/api/network-access'
import { queryKeys } from '../../lib/api/query-keys'
import { Section, SectionCard } from '../ui/Section'
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
      <StatusBadge tone={checkTone(check.ok)} label={check.ok === true ? 'OK' : check.ok === false ? 'Fix' : 'Manual'} />
    </HStack>
  )
}

export function NetworkAccessSection() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)

  const statusQuery = useQuery({
    queryKey: queryKeys.networkAccess,
    queryFn: fetchNetworkAccess,
    refetchInterval: 30_000,
  })

  const applyMutation = useMutation({
    mutationFn: (enableUfw: boolean) => applyHostFirewall({ enable_ufw: enableUfw }),
    onSuccess: (data) => {
      setMessage(data.messages.join(' · ') || (data.ok ? 'Host firewall updated' : 'No changes'))
      void queryClient.invalidateQueries({ queryKey: queryKeys.networkAccess })
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
    onSuccess: (data) => {
      const extra = data.restart_required ? ' Restart the panel if bind changed.' : ''
      setMessage((data.messages.join(' · ') || 'Setup complete') + extra)
      void queryClient.invalidateQueries({ queryKey: queryKeys.networkAccess })
    },
    onError: (err: Error) => setMessage(err.message),
  })

  const data = statusQuery.data
  const rule = data?.cloud_rule
  const ruleText = rule
    ? `${rule.direction} · ${rule.protocol} ${rule.port} · ${rule.source} · ${rule.action}`
    : ''

  const copyRule = async () => {
    if (!ruleText) return
    await navigator.clipboard.writeText(ruleText)
    setMessage('Copied security group rule')
  }

  return (
    <Section
      title="Network & firewall"
      description="Panel TCP port, host firewall (ufw), and cloud security group — VPS self-host access"
      mt={0}
    >
      <SectionCard>
        <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
          <HStack gap={2}>
            <Shield size={18} />
            <Text fontSize="sm" fontWeight="semibold">
              Access status
            </Text>
            {data ? (
              <StatusBadge
                tone={data.local_health && data.public_bind ? 'success' : 'running'}
                label={`:${data.port}`}
              />
            ) : null}
          </HStack>
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void statusQuery.refetch()}
              loading={statusQuery.isFetching}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={applyMutation.isPending}
              disabled={!data?.can_manage_host_firewall}
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

        {statusQuery.isLoading ? (
          <Text fontSize="sm" color="fg.muted">
            Loading…
          </Text>
        ) : statusQuery.isError ? (
          <Text fontSize="sm" color="red.500">
            {String(statusQuery.error)}
          </Text>
        ) : data ? (
          <VStack align="stretch" gap={4}>
            {data.login_urls.public ? (
              <Box>
                <Text fontSize="xs" color="fg.muted" mb={1}>
                  Public login
                </Text>
                <Code fontSize="sm" px={2} py={1} borderRadius="md">
                  {data.login_urls.public}
                </Code>
              </Box>
            ) : null}

            <Box borderTopWidth="1px" borderColor="border.muted" pt={2}>
              {data.checks.map((check) => (
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
                <Button size="xs" variant="ghost" onClick={() => void copyRule()}>
                  <Copy size={14} />
                  Copy
                </Button>
              </HStack>
              <List.Root fontSize="xs" color="fg.muted" gap={1} ml={4}>
                {data.cloud_steps.map((step) => (
                  <List.Item key={step}>{step}</List.Item>
                ))}
              </List.Root>
            </Box>

            <Text fontSize="xs" color="fg.subtle">
              CLI: <Code>crossborder deploy setup-access</Code> · Gateway tools:{' '}
              <Code>network_access_status</Code>, <Code>apply_panel_firewall</Code>
            </Text>
          </VStack>
        ) : null}

        {message ? (
          <Text fontSize="xs" color="fg.muted" mt={3}>
            {message}
          </Text>
        ) : null}
      </SectionCard>
    </Section>
  )
}
