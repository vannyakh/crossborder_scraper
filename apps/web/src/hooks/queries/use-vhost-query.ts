import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys } from '../../lib/api'

export function useVhostStatusQuery() {
  return useQuery({
    queryKey: queryKeys.vhostStatus,
    queryFn: () => api<import('../../lib/api').VhostStatus>('/vhost/status'),
    refetchInterval: 15_000,
  })
}

export function useVhostSitesQuery() {
  return useQuery({
    queryKey: queryKeys.vhostSites,
    queryFn: () => api<import('../../lib/api').VhostSiteList>('/vhost/sites'),
    refetchInterval: 10_000,
  })
}

export function useCreateVhostSiteMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: import('../../lib/api').VhostSiteCreate) =>
      api<import('../../lib/api').VhostActionResult>('/vhost/sites', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.vhostSites })
      void qc.invalidateQueries({ queryKey: queryKeys.vhostStatus })
      void qc.invalidateQueries({ queryKey: queryKeys.networkAccess })
    },
  })
}

export function useDeleteVhostSiteMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (siteId: string) =>
      api<import('../../lib/api').VhostActionResult>(`/vhost/sites/${encodeURIComponent(siteId)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.vhostSites })
      void qc.invalidateQueries({ queryKey: queryKeys.vhostStatus })
    },
  })
}

export function useToggleVhostSiteMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ siteId, enabled }: { siteId: string; enabled: boolean }) =>
      api<import('../../lib/api').VhostActionResult>(
        `/vhost/sites/${encodeURIComponent(siteId)}/${enabled ? 'enable' : 'disable'}`,
        {
          method: 'POST',
          body: enabled ? JSON.stringify({ enabled: true }) : undefined,
        },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.vhostSites })
      void qc.invalidateQueries({ queryKey: queryKeys.vhostStatus })
    },
  })
}

export function useReloadVhostNginxMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api<import('../../lib/api').VhostActionResult>('/vhost/reload', { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.vhostStatus })
    },
  })
}

export function useInstallNginxMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api<import('../../lib/api').VhostActionResult>('/vhost/install', { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.vhostStatus })
      void qc.invalidateQueries({ queryKey: queryKeys.vhostSites })
    },
  })
}

export function useVhostCertbotMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domain: string) =>
      api<import('../../lib/api').VhostActionResult>('/vhost/certbot', {
        method: 'POST',
        body: JSON.stringify({ domain }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.vhostSites })
      void qc.invalidateQueries({ queryKey: queryKeys.vhostStatus })
    },
  })
}
