import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, type AgentSchedule, type AgentScheduleCreate, type GatewayAgentResponse } from '../../lib/api'

export function useGatewayPromptsQuery() {
  return useQuery({
    queryKey: queryKeys.gatewayPrompts,
    queryFn: () => api<{ items: import('../../lib/api').GatewayPrompt[] }>('/gateway/prompts'),
    staleTime: 60_000,
  })
}

export function useAgentRunsQuery() {
  return useQuery({
    queryKey: queryKeys.agentRuns,
    queryFn: () => api<{ items: import('../../lib/api').AgentRunRecord[] }>('/gateway/runs'),
    refetchInterval: 15_000,
  })
}

export function useAgentSchedulesQuery() {
  return useQuery({
    queryKey: queryKeys.agentSchedules,
    queryFn: () => api<{ items: AgentSchedule[] }>('/gateway/schedules'),
    refetchInterval: 30_000,
  })
}

export function useRunAgentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { message: string; prompt_id?: string }) =>
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
