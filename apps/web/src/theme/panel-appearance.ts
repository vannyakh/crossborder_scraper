import type { ColorMode } from './config'
import defaultLoginPathBackground from '../assets/huaban-5235401074.webp'

/** Bundled default login wallpaper when no custom upload is set. */
export const DEFAULT_LOGIN_PATH_BACKGROUND_URL = defaultLoginPathBackground

/** Default sidebar logo (`apps/web/public/images/logo.png`). */
export const DEFAULT_PANEL_LOGO_URL = '/images/logo.png'

/** Default browser tab icon (`apps/web/public/images/logo.svg`; matches bundled shell logo). */
export const DEFAULT_PANEL_FAVICON_URL = '/images/logo.svg'

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

export type LoginBackgroundConfig = {
  enabled: boolean
  /** Custom image for light mode; `null` uses the bundled default. */
  lightUrl: string | null
  /** Custom image for dark mode; `null` falls back to `lightUrl` then the default. */
  darkUrl: string | null
  /** Wallpaper layer opacity (1–100). */
  imageOpacity: number
  /** Gradient overlay for form readability (1–100). */
  overlayOpacity: number
}

export type LoginPageBackgroundConfig = {
  background: LoginBackgroundConfig
}

export const DEFAULT_LOGIN_BACKGROUND: LoginBackgroundConfig = {
  enabled: true,
  lightUrl: null,
  darkUrl: null,
  imageOpacity: 45,
  overlayOpacity: 85,
}

export const DEFAULT_LOGIN_PAGE_BACKGROUND: LoginPageBackgroundConfig = {
  background: DEFAULT_LOGIN_BACKGROUND,
}

export function clampOpacityPercent(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(100, Math.max(1, Math.round(value)))
}

export function hasCustomLoginBackgroundImage(bg: LoginBackgroundConfig): boolean {
  return Boolean(bg.lightUrl || bg.darkUrl)
}

export function resolveLoginBackgroundImageUrl(
  bg: LoginBackgroundConfig,
  resolved: 'light' | 'dark',
): string {
  const custom = resolved === 'dark' ? (bg.darkUrl ?? bg.lightUrl) : bg.lightUrl
  return custom ?? DEFAULT_LOGIN_PATH_BACKGROUND_URL
}

export function resolveLoginBackgroundOpacity(bg: LoginBackgroundConfig): number {
  return clampOpacityPercent(bg.imageOpacity, DEFAULT_LOGIN_BACKGROUND.imageOpacity) / 100
}

/** @deprecated Use `LoginBackgroundConfig` */
export type LoginPathBackgroundConfig = LoginBackgroundConfig
