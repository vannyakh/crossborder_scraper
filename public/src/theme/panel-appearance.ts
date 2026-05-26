import type { ColorMode } from './config'

export type ThemeStyleOption = {
  value: ColorMode
  label: string
}

export const THEME_STYLE_OPTIONS: ThemeStyleOption[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export type ThemeColorPreset = {
  id: string
  label: string
  hex: string
}

/** aaPanel-style preset swatches */
export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  { id: 'default', label: 'Default', hex: '#20a53a' },
  { id: 'mint', label: 'Mint', hex: '#1abc9c' },
  { id: 'violet', label: 'Violet', hex: '#9b59b6' },
  { id: 'sky', label: 'Sky blue', hex: '#3498db' },
  { id: 'sakura', label: 'Sakura', hex: '#ff99cc' },
  { id: 'gold', label: 'Black Gold', hex: '#f4d1b4' },
]

export const DEFAULT_THEME_COLOR_HEX = THEME_COLOR_PRESETS[0].hex

export function matchThemeColorPreset(hex: string | null | undefined): ThemeColorPreset | null {
  if (!hex) return null
  const norm = hex.toLowerCase()
  return THEME_COLOR_PRESETS.find((p) => p.hex.toLowerCase() === norm) ?? null
}
