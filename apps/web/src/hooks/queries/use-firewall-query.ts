import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys } from '../../lib/api'

export function useFirewallStatusQuery() {
  return useQuery({
    queryKey: queryKeys.firewallStatus,
    queryFn: () => api<import('../../lib/api').FirewallStatus>('/firewall/status'),
    refetchInterval: 15_000,
  })
}

export function useFirewallRulesQuery() {
  return useQuery({
    queryKey: queryKeys.firewallRules,
    queryFn: () => api<import('../../lib/api').FirewallRuleList>('/firewall/rules'),
    refetchInterval: 10_000,
  })
}

export function useFirewallGroupsQuery() {
  return useQuery({
    queryKey: queryKeys.firewallGroups,
    queryFn: () => api<import('../../lib/api').FirewallGroupList>('/firewall/groups'),
  })
}

export function useCreateFirewallRuleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: import('../../lib/api').FirewallRuleCreate) =>
      api<import('../../lib/api').FirewallActionResult>('/firewall/rules', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.firewallRules })
      void qc.invalidateQueries({ queryKey: queryKeys.firewallStatus })
      void qc.invalidateQueries({ queryKey: queryKeys.firewallGroups })
      void qc.invalidateQueries({ queryKey: queryKeys.networkAccess })
    },
  })
}

export function useDeleteFirewallRuleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: string) =>
      api<import('../../lib/api').FirewallActionResult>(`/firewall/rules/${encodeURIComponent(ruleId)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.firewallRules })
      void qc.invalidateQueries({ queryKey: queryKeys.firewallStatus })
      void qc.invalidateQueries({ queryKey: queryKeys.firewallGroups })
    },
  })
}

export function useFirewallToggleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enabled: boolean) =>
      api<import('../../lib/api').FirewallActionResult>('/firewall/enable', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.firewallStatus })
      void qc.invalidateQueries({ queryKey: queryKeys.firewallRules })
      void qc.invalidateQueries({ queryKey: queryKeys.networkAccess })
    },
  })
}

export function useFirewallIcmpMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (block: boolean) =>
      api<import('../../lib/api').FirewallActionResult>('/firewall/icmp', {
        method: 'POST',
        body: JSON.stringify({ block }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.firewallStatus })
    },
  })
}

export function useInstallUfwMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api<import('../../lib/api').FirewallActionResult>('/firewall/install', { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.firewallStatus })
    },
  })
}

export function useUpsertFirewallGroupMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; label: string; description?: string }) =>
      api<import('../../lib/api').FirewallGroupList>('/firewall/groups', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.firewallGroups })
    },
  })
}

export function useExportFirewallRulesQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.firewallExport,
    queryFn: () => api<import('../../lib/api').FirewallExport>('/firewall/export'),
    enabled,
  })
}

export function useImportFirewallRulesMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: import('../../lib/api').FirewallExport) =>
      api<import('../../lib/api').FirewallActionResult>('/firewall/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.firewallRules })
      void qc.invalidateQueries({ queryKey: queryKeys.firewallStatus })
      void qc.invalidateQueries({ queryKey: queryKeys.firewallGroups })
    },
  })
}
