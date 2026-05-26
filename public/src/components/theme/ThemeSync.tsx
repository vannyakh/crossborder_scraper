import { useTheme } from '../../hooks/use-theme'

/** Mount once to sync Zustand color mode → document .light / .dark class */
export function ThemeSync() {
  useTheme()
  return null
}
