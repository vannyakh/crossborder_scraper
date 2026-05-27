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
