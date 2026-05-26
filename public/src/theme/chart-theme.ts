import { getAccentColor, type AccentKey } from './config'

export type ChartThemeTokens = {
  accent: string
  secondary: string
  text: string
  muted: string
  grid: string
  track: string
  success: string
  warning: string
  danger: string
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function buildChartTheme(
  accentKey: AccentKey,
  resolved: 'light' | 'dark',
): ChartThemeTokens {
  const accent = getAccentColor(accentKey, resolved)
  return {
    accent: cssVar('--chart-accent', accent),
    secondary: cssVar('--chart-series-secondary', resolved === 'dark' ? '#f0883e' : '#ea580c'),
    text: cssVar('--chart-fg', resolved === 'dark' ? '#c9d1d9' : '#374151'),
    muted: cssVar('--chart-muted', resolved === 'dark' ? '#8b949e' : '#6b7280'),
    grid: cssVar('--chart-grid', resolved === 'dark' ? '#30363d' : '#e5e7eb'),
    track: cssVar('--chart-track', resolved === 'dark' ? '#21262d' : '#eef2f6'),
    success: resolved === 'dark' ? '#3fb950' : '#16a34a',
    warning: resolved === 'dark' ? '#f0883e' : '#ea580c',
    danger: resolved === 'dark' ? '#ff7b72' : '#e11d48',
  }
}
