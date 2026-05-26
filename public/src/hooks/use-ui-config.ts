import { useShallow } from 'zustand/react/shallow'
import {
  accentChakraPalette,
  type AccentKey,
  type ThemeConfig,
} from '../theme/config'
import { useThemeStore, type ColorMode } from '../stores/theme-store'

export function useUiConfig() {
  return useThemeStore(
    useShallow((s) => ({
      mode: s.mode,
      config: s.config,
      resolved: s.resolved,
      accentPalette: accentChakraPalette[s.config.accent],
      setMode: s.setMode,
      setConfig: s.setConfig,
      resetConfig: s.resetConfig,
    })),
  )
}

export function useThemeConfig(): ThemeConfig {
  return useThemeStore((s) => s.config)
}

export function useAccentPalette() {
  const accent = useThemeStore((s) => s.config.accent)
  return accentChakraPalette[accent]
}

export function useColorMode(): ColorMode {
  return useThemeStore((s) => s.mode)
}

export type { AccentKey, ThemeConfig, ColorMode }
