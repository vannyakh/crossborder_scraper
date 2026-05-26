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
  root.style.setProperty('--flyout-bg', isDark ? '#1c2128' : '#ffffff')
  root.style.setProperty(
    '--flyout-shadow',
    isDark ? '0 12px 40px rgba(0, 0, 0, 0.55)' : '0 10px 38px rgba(15, 23, 42, 0.12)',
  )
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
  root.style.setProperty('--logo-fill-deep', `color-mix(in srgb, ${accent} 72%, black)`)
  root.style.setProperty('--logo-fill', accent)
  root.style.setProperty('--logo-fill-mid', `color-mix(in srgb, ${accent} 72%, white)`)
  root.style.setProperty('--logo-fill-bright', `color-mix(in srgb, ${accent} 45%, white)`)
  root.style.setProperty('--radius-input', radius)
  root.style.setProperty('--radius-panel', radius)
  root.style.setProperty('--radius-card', radius)
  root.style.setProperty('--font-size-base', getFontScaleValue(merged.fontScale))
  root.style.setProperty('--density-scale', getDensityScale(merged.density))
  root.style.setProperty('--motion-duration', getMotionDuration(merged.motionSpeed))
  root.style.setProperty('--shell-padding', compact ? '0.75rem' : '1.25rem')
  root.style.setProperty('--shell-padding-inline', compact ? '0.75rem' : '1rem')
  root.style.setProperty('--content-gap', compact ? '0.75rem' : '1rem')

  const isDark = resolved === 'dark'
  const chartFg = isDark ? '#c9d1d9' : '#374151'
  const chartMuted = isDark ? '#8b949e' : '#6b7280'
  const chartGrid = isDark ? '#30363d' : '#e5e7eb'
  const chartTrack = isDark ? '#21262d' : '#eef2f6'
  const chartSecondary = isDark ? '#f0883e' : '#ea580c'

  root.style.setProperty('--chart-fg', chartFg)
  root.style.setProperty('--chart-muted', chartMuted)
  root.style.setProperty('--chart-grid', chartGrid)
  root.style.setProperty('--chart-track', chartTrack)
  root.style.setProperty('--chart-series-secondary', chartSecondary)
  root.style.setProperty('--chart-accent', accent)

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
