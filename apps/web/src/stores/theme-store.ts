import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  defaultThemeConfig,
  mergeThemeConfig,
  type ColorMode,
  type ThemeConfig,
} from '../theme/config'
import { applyTheme } from '../theme/apply-theme'

type ThemeState = {
  mode: ColorMode
  config: ThemeConfig
  resolved: 'light' | 'dark'
  setMode: (mode: ColorMode) => void
  setConfig: (patch: Partial<ThemeConfig>) => void
  replaceConfig: (config: ThemeConfig) => void
  resetConfig: () => void
  setResolved: (resolved: 'light' | 'dark') => void
  applyAll: () => void
}

function commitTheme(mode: ColorMode, config: ThemeConfig) {
  const { resolved, config: merged } = applyTheme(mode, config)
  return { mode, config: merged, resolved }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      config: defaultThemeConfig,
      resolved: 'dark',
      setMode: (mode) => {
        set(commitTheme(mode, get().config))
      },
      setConfig: (patch) => {
        const next = mergeThemeConfig({ ...get().config, ...patch })
        set(commitTheme(get().mode, next))
      },
      replaceConfig: (config) => {
        set(commitTheme(get().mode, mergeThemeConfig(config)))
      },
      resetConfig: () => {
        set(commitTheme(get().mode, defaultThemeConfig))
      },
      setResolved: (resolved) => set({ resolved }),
      applyAll: () => {
        const { mode, config } = get()
        set(commitTheme(mode, mergeThemeConfig(config)))
      },
    }),
    {
      name: 'crossborder-theme',
      version: 5,
      partialize: (s) => ({ mode: s.mode, config: s.config }),
      migrate: (persisted) => {
        const state = persisted as { mode?: ColorMode; config?: Partial<ThemeConfig> }
        const merged = mergeThemeConfig(state.config)
        if (!state.config?.customAccentHex && merged.accent === 'blue') {
          merged.customAccentHex = '#2563eb'
        }
        return {
          mode: state.mode ?? 'dark',
          config: merged,
        }
      },
      onRehydrateStorage: () => (state) => {
        state?.applyAll()
      },
    },
  ),
)

export type { ColorMode, ThemeConfig }
