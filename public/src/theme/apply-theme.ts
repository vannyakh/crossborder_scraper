import {
  getAccentColor,
  getAccentMuted,
  getDensityScale,
  getFontScaleValue,
  getMotionDuration,
  getRadiusValue,
  mergeThemeConfig,
  type ColorMode,
  type ThemeConfig,
} from './config'

export function resolveColorMode(mode: ColorMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export function applyColorModeToDocument(resolved: 'light' | 'dark') {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.style.colorScheme = resolved
  root.dataset.colorMode = resolved
}

function applyScrollbarVars(resolved: 'light' | 'dark', accent: string) {
  const root = document.documentElement
  const isDark = resolved === 'dark'

  root.style.setProperty('--scrollbar-size', '8px')
  root.style.setProperty('--scrollbar-track', isDark ? '#0d1117' : '#f0f3f6')
  root.style.setProperty('--scrollbar-thumb', isDark ? '#30363d' : '#c4cdd5')
  root.style.setProperty('--scrollbar-thumb-hover', accent)
  root.style.setProperty('--scrollbar-border', isDark ? '#161b22' : '#ffffff')
}

export function applyThemeConfigToDocument(
  config: ThemeConfig,
  resolved: 'light' | 'dark',
) {
  const root = document.documentElement
  const merged = mergeThemeConfig(config)
  const accent = getAccentColor(merged.accent, resolved)
  const accentMuted = getAccentMuted(merged.accent, resolved)
  const radius = getRadiusValue(merged.radius)
  const compact = merged.density === 'compact'

  root.dataset.accent = merged.accent
  root.dataset.density = merged.density
  root.dataset.fontScale = merged.fontScale
  root.dataset.pageTransition = merged.pageTransition
  root.dataset.motionSpeed = merged.motionSpeed
  root.dataset.radius = merged.radius

  root.style.setProperty('--app-accent', accent)
  root.style.setProperty('--brand-emphasis', accent)
  root.style.setProperty('--nav-active-fg', accent)
  root.style.setProperty('--nav-active-bg', accentMuted)
  root.style.setProperty('--radius-input', radius)
  root.style.setProperty('--radius-panel', radius)
  root.style.setProperty('--radius-card', radius)
  root.style.setProperty('--font-size-base', getFontScaleValue(merged.fontScale))
  root.style.setProperty('--density-scale', getDensityScale(merged.density))
  root.style.setProperty('--motion-duration', getMotionDuration(merged.motionSpeed))
  root.style.setProperty('--shell-padding', compact ? '0.75rem' : '1.25rem')
  root.style.setProperty('--shell-padding-inline', compact ? '0.75rem' : '1rem')
  root.style.setProperty('--content-gap', compact ? '0.75rem' : '1rem')

  applyScrollbarVars(resolved, accent)

  if (merged.reducedMotion) {
    root.classList.add('reduce-motion')
  } else {
    root.classList.remove('reduce-motion')
  }

  if (merged.pageTransitions && !merged.reducedMotion) {
    root.classList.add('page-transitions-on')
  } else {
    root.classList.remove('page-transitions-on')
  }
}

export function applyTheme(mode: ColorMode, config?: Partial<ThemeConfig>) {
  const merged = mergeThemeConfig(config)
  const resolved = resolveColorMode(mode)
  applyColorModeToDocument(resolved)
  applyThemeConfigToDocument(merged, resolved)
  return { resolved, config: merged }
}
