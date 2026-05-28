import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  apiFormData,
  queryKeys,
  type AgentSchedule,
  type AgentScheduleCreate,
  type GatewayAgentResponse,
} from '../../lib/api'

export function useGatewayPromptsQuery() {
  return useQuery({
    queryKey: queryKeys.gatewayPrompts,
    queryFn: () => api<{ items: import('../../lib/api').GatewayPrompt[] }>('/gateway/prompts'),
    staleTime: 60_000,
  })
}

export function useAgentRunsQuery(limit = 30, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.agentRuns, limit] as const,
    queryFn: () =>
      api<{ items: import('../../lib/api').AgentRunRecord[] }>(`/gateway/runs?limit=${limit}`),
    enabled,
    refetchInterval: enabled ? 15_000 : false,
  })
}

export function useGatewayToolsQuery() {
  return useQuery({
    queryKey: queryKeys.gatewayTools,
    queryFn: () => api<{ items: import('../../lib/api').GatewayTool[] }>('/gateway/tools'),
    staleTime: 60_000,
  })
}

export function useGatewayWorkflowsQuery() {
  return useQuery({
    queryKey: queryKeys.gatewayWorkflows,
    queryFn: () => api<{ items: import('../../lib/api').GatewayWorkflow[] }>('/gateway/workflows'),
    staleTime: 60_000,
  })
}

export function useRunWorkflowMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { workflowId: string; inputs: Record<string, unknown> }) =>
      api<import('../../lib/api').GatewayWorkflowRunResponse>(
        `/gateway/workflows/${payload.workflowId}/run`,
        {
          method: 'POST',
          body: JSON.stringify({ inputs: payload.inputs }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentRuns })
    },
  })
}

export function useAgentSchedulesQuery() {
  return useQuery({
    queryKey: queryKeys.agentSchedules,
    queryFn: () => api<{ items: AgentSchedule[] }>('/gateway/schedules'),
    refetchInterval: 30_000,
  })
}

export function useGatewaySkillsQuery() {
  return useQuery({
    queryKey: queryKeys.gatewaySkills,
    queryFn: () => api<import('../../lib/api').GatewaySkillList>('/gateway/skills'),
    staleTime: 30_000,
  })
}

export function useSetEnabledSkillsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (enabled: string[]) =>
      api<import('../../lib/api').GatewaySkillList>('/gateway/skills/enabled', {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewaySkills })
    },
  })
}

export function useGatewayRulesQuery() {
  return useQuery({
    queryKey: queryKeys.gatewayRules,
    queryFn: () => api<import('../../lib/api').AgentRuleList>('/gateway/rules'),
    staleTime: 30_000,
  })
}

export function useAgentRuleQuery(ruleId: string | null) {
  return useQuery({
    queryKey: queryKeys.gatewayRule(ruleId ?? ''),
    queryFn: () => api<import('../../lib/api').AgentRuleDetail>(`/gateway/rules/${ruleId}`),
    enabled: Boolean(ruleId),
    staleTime: 30_000,
  })
}

export function useSetEnabledRulesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (enabled: string[]) =>
      api<import('../../lib/api').AgentRuleList>('/gateway/rules/enabled', {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayRules })
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayStatus })
    },
  })
}

export function useCreateAgentRuleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: import('../../lib/api').AgentRuleCreate) =>
      api<import('../../lib/api').AgentRuleDetail>('/gateway/rules', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayRules })
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayStatus })
    },
  })
}

export function useUpdateAgentRuleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      ruleId,
      ...patch
    }: Partial<Omit<import('../../lib/api').AgentRuleCreate, 'id'>> & { ruleId: string }) =>
      api<import('../../lib/api').AgentRuleDetail>(`/gateway/rules/${ruleId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayRules })
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayRule(variables.ruleId) })
    },
  })
}

export function useDeleteAgentRuleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: string) =>
      api<{ ok: boolean; rule_id: string }>(`/gateway/rules/${ruleId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayRules })
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayStatus })
    },
  })
}

export function useInstallSkillMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, replace }: { file: File; replace?: boolean }) => {
      const form = new FormData()
      form.append('file', file)
      const q = replace ? '?replace=true' : ''
      return apiFormData<{ ok: boolean; skill_id: string }>(`/gateway/skills/install${q}`, form)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewaySkills })
    },
  })
}

export function useUninstallSkillMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (skillId: string) =>
      api<{ ok: boolean; skill_id: string }>(`/gateway/skills/installed/${skillId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewaySkills })
    },
  })
}

export type SkillRegistryQueryParams = {
  kind: 'skill' | 'plugin'
  sort?: string
  limit?: number
  cursor?: string | null
  q?: string
}

export function useSkillRegistryQuery(params: SkillRegistryQueryParams, enabled = true) {
  const search = new URLSearchParams()
  search.set('kind', params.kind)
  search.set('sort', params.sort ?? 'downloads')
  search.set('limit', String(params.limit ?? 24))
  if (params.cursor) search.set('cursor', params.cursor)
  if (params.q?.trim()) search.set('q', params.q.trim())

  return useQuery({
    queryKey: queryKeys.gatewaySkillRegistry({
      kind: params.kind,
      sort: params.sort ?? 'downloads',
      limit: params.limit ?? 24,
      cursor: params.cursor ?? null,
      q: params.q?.trim() ?? '',
    }),
    queryFn: () =>
      api<import('../../lib/api').SkillRegistryList>(
        `/gateway/skills/registry?${search.toString()}`,
      ),
    staleTime: 60_000,
    enabled,
  })
}

export function useInstallRegistrySkillMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { slug: string; version?: string; replace?: boolean }) =>
      api<{ ok: boolean; skill_id: string }>('/gateway/skills/registry/install', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewaySkills })
      void queryClient.invalidateQueries({ queryKey: ['gateway', 'skills', 'registry'] })
    },
  })
}

export function useUpdateRegistrySkillMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, version }: { slug: string; version?: string }) => {
      const q = version ? `?version=${encodeURIComponent(version)}` : ''
      return api<{ ok: boolean; skill_id: string }>(`/gateway/skills/registry/${slug}/update${q}`, {
        method: 'POST',
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewaySkills })
      void queryClient.invalidateQueries({ queryKey: ['gateway', 'skills', 'registry'] })
    },
  })
}

export function useRunAgentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { message: string; prompt_id?: string; skill_ids?: string[] }) =>
      api<GatewayAgentResponse>('/gateway/agent/run', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentRuns })
    },
  })
}

export function useCreateScheduleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AgentScheduleCreate) =>
      api<AgentSchedule>('/gateway/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentSchedules })
    },
  })
}

export function useUpdateScheduleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<AgentSchedule> & { id: string }) =>
      api<AgentSchedule>(`/gateway/schedules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentSchedules })
    },
  })
}

export function useDeleteScheduleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean }>(`/gateway/schedules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentSchedules })
    },
  })
}

export function useRunScheduleNowMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<GatewayAgentResponse>(`/gateway/schedules/${id}/run`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentRuns })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentSchedules })
    },
  })
}

export function useTelegramChannelQuery() {
  return useQuery({
    queryKey: queryKeys.gatewayTelegram,
    queryFn: () => api<import('../../lib/api').TelegramChannelConfig>('/gateway/telegram'),
    staleTime: 30_000,
  })
}

export function useUpdateTelegramChannelMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: import('../../lib/api').TelegramChannelUpdate) =>
      api<import('../../lib/api').TelegramChannelConfig>('/gateway/telegram', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayTelegram })
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayStatus })
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayChannels })
    },
  })
}

export function useIntegrateChannelQuery(channelId: string) {
  return useQuery({
    queryKey: queryKeys.gatewayChannel(channelId),
    queryFn: () =>
      api<import('../../lib/api').IntegrateChannelDetail>(`/gateway/channels/${channelId}`),
    staleTime: 30_000,
  })
}

export function useUpdateIntegrateChannelMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ channelId, updates }: { channelId: string; updates: Record<string, unknown> }) =>
      api<import('../../lib/api').IntegrateChannelDetail>(`/gateway/channels/${channelId}`, {
        method: 'PATCH',
        body: JSON.stringify({ updates }),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.gatewayChannel(variables.channelId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayChannels })
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayStatus })
      if (variables.channelId === 'telegram') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayTelegram })
      }
    },
  })
}

export function useReloadIntegrateChannelMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (channelId: string) =>
      api<{ ok: boolean; channel_id: string; runtime_active: boolean; message?: string }>(
        `/gateway/channels/${channelId}/reload`,
        { method: 'POST' },
      ),
    onSuccess: (_data, channelId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayChannel(channelId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayChannels })
      void queryClient.invalidateQueries({ queryKey: queryKeys.gatewayStatus })
    },
  })
}
