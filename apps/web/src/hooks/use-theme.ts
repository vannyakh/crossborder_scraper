import { useEffect } from 'react'
import { useThemeStore } from '../stores/theme-store'
import { applyTheme } from '../theme/apply-theme'
import type { ColorMode } from '../theme/config'

/** Keeps document in sync when mode/config change (e.g. system preference). */
export function useTheme() {
  const mode = useThemeStore((s) => s.mode)
  const config = useThemeStore((s) => s.config)
  const resolved = useThemeStore((s) => s.resolved)
  const setMode = useThemeStore((s) => s.setMode)
  const setConfig = useThemeStore((s) => s.setConfig)
  const resetConfig = useThemeStore((s) => s.resetConfig)
  const setResolved = useThemeStore((s) => s.setResolved)

  useEffect(() => {
    const sync = () => {
      const { resolved: next } = applyTheme(mode, config)
      setResolved(next)
    }

    sync()

    if (mode !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => sync()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode, config, setResolved])

  const toggle = () => {
    const next: ColorMode = resolved === 'dark' ? 'light' : 'dark'
    setMode(next)
  }

  return {
    mode,
    config,
    resolved,
    setMode,
    setConfig,
    resetConfig,
    toggle,
    isDark: resolved === 'dark',
  }
}

export type { ColorMode }
