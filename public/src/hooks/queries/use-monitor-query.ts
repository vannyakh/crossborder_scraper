import { useQuery } from '@tanstack/react-query'
import { api, queryKeys, type HardwareMonitor, type MonitorStatus } from '../../lib/api'
import { useAuthStore } from '../../stores/auth-store'

export function useHardwareMonitorQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.hardwareMonitor,
    queryFn: () => api<HardwareMonitor>('/monitor/hardware'),
    enabled: isAuthenticated,
    refetchInterval: 5_000,
  })
}

export function useMonitorStatusQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.monitorStatus,
    queryFn: () => api<MonitorStatus>('/monitor/status'),
    enabled: isAuthenticated,
    refetchInterval: 5_000,
  })
}
