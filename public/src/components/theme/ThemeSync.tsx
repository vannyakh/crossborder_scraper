import { useTheme } from '../../hooks/use-theme'

/** Syncs Zustand theme + UI config → document classes and CSS variables */
export function ThemeSync() {
  useTheme()
  return null
}
