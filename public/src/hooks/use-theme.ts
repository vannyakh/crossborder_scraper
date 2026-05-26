import { useEffect } from 'react'
import {
  applyColorModeToDocument,
  resolveColorMode,
  useThemeStore,
  type ColorMode,
} from '../stores/theme-store'

export function useTheme() {
  const mode = useThemeStore((s) => s.mode)
  const resolved = useThemeStore((s) => s.resolved)
  const setMode = useThemeStore((s) => s.setMode)
  const setResolved = useThemeStore((s) => s.setResolved)

  useEffect(() => {
    const apply = () => {
      const next = resolveColorMode(mode)
      setResolved(next)
      applyColorModeToDocument(next)
    }

    apply()

    if (mode !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode, setResolved])

  const toggle = () => {
    const next: ColorMode = resolved === 'dark' ? 'light' : 'dark'
    setMode(next)
  }

  return { mode, resolved, setMode, toggle, isDark: resolved === 'dark' }
}
