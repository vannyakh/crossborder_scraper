import {
  clampOpacityPercent,
  DEFAULT_LOGIN_BACKGROUND,
  DEFAULT_LOGIN_PAGE_BACKGROUND,
  type LoginBackgroundConfig,
  type LoginPageBackgroundConfig,
} from './panel-appearance'

export type { LoginBackgroundConfig, LoginPageBackgroundConfig, LoginPathBackgroundConfig } from './panel-appearance'

export type ColorMode = 'light' | 'dark' | 'system'

export type AccentKey = 'blue' | 'purple' | 'green' | 'orange' | 'rose'

export type RadiusScale = 'sm' | 'md' | 'lg'

export type FontScale = 'sm' | 'md' | 'lg'

export type Density = 'compact' | 'comfortable'

export type PageTransitionStyle = 'none' | 'fade' | 'slide' | 'slide-up' | 'scale'

export type MotionSpeed = 'fast' | 'normal' | 'slow'

export type PanelBranding = {
  logoUrl: string | null
  faviconUrl: string | null
}

export type PanelMainBackground = {
  enabled: boolean
  lightUrl: string | null
  darkUrl: string | null
  imageOpacity: number
  contentOpacity: number
}

export type ThemeConfig = {
  accent: AccentKey
  /** When set, overrides preset accent color (hex). */
  customAccentHex: string | null
  radius: RadiusScale
  fontScale: FontScale
  density: Density
  reducedMotion: boolean
  pageTransitions: boolean
  pageTransition: PageTransitionStyle
  motionSpeed: MotionSpeed
  sidebarOpacity: number
  branding: PanelBranding
  mainBackground: PanelMainBackground
  /** @deprecated Legacy flag; migrated into `loginPage.background`. */
  loginBackgroundEnabled?: boolean
  loginPage: LoginPageBackgroundConfig
}

export const defaultThemeConfig: ThemeConfig = {
  accent: 'green',
  customAccentHex: '#20a53a',
  radius: 'md',
  fontScale: 'md',
  density: 'comfortable',
  reducedMotion: false,
  pageTransitions: true,
  pageTransition: 'slide',
  motionSpeed: 'normal',
  sidebarOpacity: 100,
  branding: {
    logoUrl: null,
    faviconUrl: null,
  },
  mainBackground: {
    enabled: false,
    lightUrl: null,
    darkUrl: null,
    imageOpacity: 100,
    contentOpacity: 100,
  },
  loginBackgroundEnabled: false,
  loginPage: DEFAULT_LOGIN_PAGE_BACKGROUND,
}

/** Chakra colorPalette names for accent-driven controls */
export const accentChakraPalette: Record<
  AccentKey,
  'blue' | 'purple' | 'green' | 'orange' | 'pink'
> = {
  blue: 'blue',
  purple: 'purple',
  green: 'green',
  orange: 'orange',
  rose: 'pink',
}

export const accentOptions: { key: AccentKey; label: string }[] = [
  { key: 'blue', label: 'Blue' },
  { key: 'purple', label: 'Purple' },
  { key: 'green', label: 'Green' },
  { key: 'orange', label: 'Orange' },
  { key: 'rose', label: 'Rose' },
]

export const pageTransitionOptions: { value: PageTransitionStyle; label: string }[] = [
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'slide-up', label: 'Slide up' },
  { value: 'scale', label: 'Scale' },
  { value: 'none', label: 'None' },
]

export const motionSpeedOptions: { value: MotionSpeed; label: string }[] = [
  { value: 'fast', label: 'Fast' },
  { value: 'normal', label: 'Normal' },
  { value: 'slow', label: 'Slow' },
]

const accentColors: Record<AccentKey, { light: string; dark: string; muted: string }> = {
  blue: { light: '#2563eb', dark: '#58a6ff', muted: 'rgba(37, 99, 235, 0.12)' },
  purple: { light: '#7c3aed', dark: '#a78bfa', muted: 'rgba(124, 58, 237, 0.12)' },
  green: { light: '#16a34a', dark: '#3fb950', muted: 'rgba(22, 163, 74, 0.12)' },
  orange: { light: '#ea580c', dark: '#f0883e', muted: 'rgba(234, 88, 12, 0.12)' },
  rose: { light: '#e11d48', dark: '#ff7b72', muted: 'rgba(225, 29, 72, 0.12)' },
}

const radiusValues: Record<RadiusScale, string> = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
}

const fontScaleValues: Record<FontScale, string> = {
  sm: '0.875rem',
  md: '1rem',
  lg: '1.125rem',
}

const densityScale: Record<Density, string> = {
  compact: '0.875',
  comfortable: '1',
}

const motionDurationValues: Record<MotionSpeed, string> = {
  fast: '0.15s',
  normal: '0.28s',
  slow: '0.45s',
}

type LegacyLoginPage = {
  path?: Partial<LoginBackgroundConfig> & {
    darkOpacity?: number
    lightOpacity?: number
  }
  background?: Partial<LoginBackgroundConfig>
  customWallpaperEnabled?: boolean
  customWallpaperOpacity?: number
}

function migrateLoginBackgroundConfig(partial: Partial<ThemeConfig>): LoginBackgroundConfig {
  const lp = partial.loginPage as LegacyLoginPage | undefined
  const legacy = { ...lp?.path, ...lp?.background }

  let lightUrl = legacy.lightUrl ?? null
  let darkUrl = legacy.darkUrl ?? null

  const useMainWallpaper =
    lp?.customWallpaperEnabled ?? partial.loginBackgroundEnabled ?? false
  if (useMainWallpaper && partial.mainBackground?.enabled) {
    if (!lightUrl) lightUrl = partial.mainBackground.lightUrl
    if (!darkUrl) darkUrl = partial.mainBackground.darkUrl
  }

  let imageOpacity = legacy.imageOpacity
  if (imageOpacity === undefined) {
    const dark = legacy.darkOpacity
    const light = legacy.lightOpacity
    if (dark !== undefined || light !== undefined) {
      imageOpacity = Math.round(
        ((dark ?? DEFAULT_LOGIN_BACKGROUND.imageOpacity) +
          (light ?? DEFAULT_LOGIN_BACKGROUND.imageOpacity)) /
          2,
      )
    } else if (lp?.customWallpaperOpacity !== undefined) {
      imageOpacity = lp.customWallpaperOpacity
    }
  }

  return {
    enabled: legacy.enabled ?? DEFAULT_LOGIN_BACKGROUND.enabled,
    lightUrl,
    darkUrl,
    imageOpacity: clampOpacityPercent(
      imageOpacity ?? DEFAULT_LOGIN_BACKGROUND.imageOpacity,
      DEFAULT_LOGIN_BACKGROUND.imageOpacity,
    ),
    overlayOpacity: clampOpacityPercent(
      legacy.overlayOpacity ?? DEFAULT_LOGIN_BACKGROUND.overlayOpacity,
      DEFAULT_LOGIN_BACKGROUND.overlayOpacity,
    ),
  }
}

function migrateLoginPageConfig(partial: Partial<ThemeConfig>): LoginPageBackgroundConfig {
  return { background: migrateLoginBackgroundConfig(partial) }
}

export function mergeThemeConfig(partial?: Partial<ThemeConfig> | null): ThemeConfig {
  if (!partial) return { ...defaultThemeConfig }
  const loginPage = migrateLoginPageConfig(partial)
  return {
    ...defaultThemeConfig,
    ...partial,
    branding: { ...defaultThemeConfig.branding, ...partial.branding },
    mainBackground: { ...defaultThemeConfig.mainBackground, ...partial.mainBackground },
    loginPage,
  }
}

export function resolveThemeAccentHex(
  config: ThemeConfig,
  resolved: 'light' | 'dark',
): string {
  if (config.customAccentHex?.trim()) {
    return config.customAccentHex.trim()
  }
  return getAccentColor(config.accent, resolved)
}

export function getAccentColor(accent: AccentKey, resolved: 'light' | 'dark'): string {
  return accentColors[accent][resolved]
}

export function getAccentMuted(accent: AccentKey, resolved: 'light' | 'dark'): string {
  if (resolved === 'dark') {
    return accentColors[accent].muted.replace('0.12', '0.18')
  }
  return accentColors[accent].muted
}

export function getRadiusValue(scale: RadiusScale): string {
  return radiusValues[scale]
}

export function getFontScaleValue(scale: FontScale): string {
  return fontScaleValues[scale]
}

export function getDensityScale(density: Density): string {
  return densityScale[density]
}

export function getMotionDuration(scale: MotionSpeed): string {
  return motionDurationValues[scale]
}

export function getMotionDurationSeconds(scale: MotionSpeed): number {
  return parseFloat(motionDurationValues[scale])
}
