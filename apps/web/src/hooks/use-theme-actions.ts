import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  getAccentColor,
  type AccentKey,
} from '../theme/config'
import { DEFAULT_THEME_COLOR_HEX, matchThemeColorPreset } from '../theme/panel-appearance'
import { useThemeStore } from '../stores/theme-store'

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '').trim()
  if (h.length !== 6) return null
  const n = parseInt(h, 16)
  if (Number.isNaN(n)) return null
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function colorDistance(a: string, b: string): number {
  const ra = hexToRgb(a)
  const rb = hexToRgb(b)
  if (!ra || !rb) return Number.POSITIVE_INFINITY
  return (ra[0] - rb[0]) ** 2 + (ra[1] - rb[1]) ** 2 + (ra[2] - rb[2]) ** 2
}

function closestAccentKey(hex: string, resolved: 'light' | 'dark'): AccentKey {
  const keys: AccentKey[] = ['blue', 'purple', 'green', 'orange', 'rose']
  let best: AccentKey = 'green'
  let bestDist = Number.POSITIVE_INFINITY
  for (const key of keys) {
    const d = colorDistance(hex, getAccentColor(key, resolved))
    if (d < bestDist) {
      bestDist = d
      best = key
    }
  }
  return best
}

/** Shared accent / appearance updates for drawer + panel settings. */
export function useThemeActions() {
  const { config, resolved, setConfig } = useThemeStore(
    useShallow((s) => ({
      config: s.config,
      resolved: s.resolved,
      setConfig: s.setConfig,
    })),
  )

  const activeAccentHex = config.customAccentHex?.trim() || getAccentColor(config.accent, resolved)

  const setAccentHex = useCallback(
    (hex: string) => {
      const trimmed = hex.trim()
      setConfig({
        customAccentHex: trimmed,
        accent: closestAccentKey(trimmed, resolved),
      })
    },
    [resolved, setConfig],
  )

  const resetAccentColor = useCallback(() => {
    setConfig({
      accent: 'green',
      customAccentHex: DEFAULT_THEME_COLOR_HEX,
    })
  }, [setConfig])

  const activePreset = matchThemeColorPreset(activeAccentHex)
  const isCustomAccentColor = !activePreset

  return {
    activeAccentHex,
    activePreset,
    isCustomAccentColor,
    setAccentHex,
    resetAccentColor,
  }
}
