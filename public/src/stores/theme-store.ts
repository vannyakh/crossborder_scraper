import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ColorMode = 'light' | 'dark' | 'system'

type ThemeState = {
  mode: ColorMode
  setMode: (mode: ColorMode) => void
  resolved: 'light' | 'dark'
  setResolved: (resolved: 'light' | 'dark') => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',
      resolved: 'dark',
      setMode: (mode) => set({ mode }),
      setResolved: (resolved) => set({ resolved }),
    }),
    { name: 'crossborder-theme', partialize: (s) => ({ mode: s.mode }) },
  ),
)

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
}
