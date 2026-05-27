import { useMemo } from 'react'
import { buildChartTheme } from '../theme/chart-theme'
import { useUiConfig } from './use-ui-config'

export function useChartTheme() {
  const { config, resolved } = useUiConfig()
  return useMemo(() => buildChartTheme(config.accent, resolved), [config.accent, resolved])
}
