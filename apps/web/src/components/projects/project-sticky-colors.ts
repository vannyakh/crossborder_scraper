export type StickyNoteColor = 'purple' | 'amber' | 'blue' | 'green' | 'pink' | 'gray'

export const STICKY_NOTE_COLOR_ORDER: StickyNoteColor[] = [
  'purple',
  'amber',
  'blue',
  'green',
  'pink',
  'gray',
]

export const DEFAULT_STICKY_NOTE_COLOR: StickyNoteColor = 'purple'

export const STICKY_NOTE_MIN_W = 160
export const STICKY_NOTE_MIN_H = 72
export const STICKY_NOTE_MAX_W = 640
export const STICKY_NOTE_MAX_H = 480
export const STICKY_NOTE_DEFAULT_W = 280
export const STICKY_NOTE_DEFAULT_H = 140

export type StickyNoteTheme = {
  bg: string
  border: string
  fg: string
}

export const STICKY_NOTE_THEMES_DARK: Record<StickyNoteColor, StickyNoteTheme> = {
  purple: { bg: '#3b0764', border: '#a855f7', fg: '#faf5ff' },
  amber: { bg: '#451a03', border: '#f59e0b', fg: '#fffbeb' },
  blue: { bg: '#172554', border: '#3b82f6', fg: '#eff6ff' },
  green: { bg: '#052e16', border: '#22c55e', fg: '#ecfdf5' },
  pink: { bg: '#500724', border: '#ec4899', fg: '#fdf2f8' },
  gray: { bg: '#1e293b', border: '#94a3b8', fg: '#f8fafc' },
}

export const STICKY_NOTE_THEMES_LIGHT: Record<StickyNoteColor, StickyNoteTheme> = {
  purple: { bg: '#f3e8ff', border: '#9333ea', fg: '#3b0764' },
  amber: { bg: '#fef3c7', border: '#d97706', fg: '#451a03' },
  blue: { bg: '#dbeafe', border: '#2563eb', fg: '#1e3a8a' },
  green: { bg: '#d1fae5', border: '#059669', fg: '#064e3b' },
  pink: { bg: '#fce7f3', border: '#db2777', fg: '#831843' },
  gray: { bg: '#f1f5f9', border: '#64748b', fg: '#0f172a' },
}

export function stickyNoteTheme(
  color: StickyNoteColor,
  colorMode: 'light' | 'dark',
): StickyNoteTheme {
  return colorMode === 'light' ? STICKY_NOTE_THEMES_LIGHT[color] : STICKY_NOTE_THEMES_DARK[color]
}

/** Inline CSS vars so sticky background updates immediately (avoids generic workflow-node override). */
export function stickyNoteStyleVars(
  color: StickyNoteColor,
  colorMode: 'light' | 'dark',
): Record<string, string> {
  const theme = stickyNoteTheme(color, colorMode)
  return {
    '--project-flow-sticky-bg': theme.bg,
    '--project-flow-sticky-border': theme.border,
    '--project-flow-sticky-fg': theme.fg,
  }
}
