import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

/** Alist-inspired: flat surfaces, blue accent, rounded-lg controls */
const customConfig = defineConfig({
  globalCss: {
    html: { bg: 'canvas' },
    body: {
      bg: 'canvas',
      color: 'fg',
      minH: '100dvh',
      fontFamily: 'body',
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: {
          value: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
        },
        body: {
          value: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
        },
        mono: {
          value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        },
      },
      radii: {
        panel: { value: 'var(--radius-panel, 0.5rem)' },
        card: { value: 'var(--radius-card, 0.5rem)' },
        input: { value: 'var(--radius-input, 0.5rem)' },
        pill: { value: '9999px' },
      },
      colors: {
        brand: {
          50: { value: '#eff6ff' },
          100: { value: '#dbeafe' },
          200: { value: '#bfdbfe' },
          300: { value: '#93c5fd' },
          400: { value: '#60a5fa' },
          500: { value: '#3b82f6' },
          600: { value: '#2563eb' },
          700: { value: '#1d4ed8' },
        },
      },
    },
    semanticTokens: {
      colors: {
        canvas: {
          value: { _light: '#f7f8fa', _dark: '#0d1117' },
        },
        fg: {
          value: { _light: '#1f2328', _dark: '#e6edf3' },
        },
        'fg.muted': {
          value: { _light: '#656d76', _dark: '#8b949e' },
        },
        'fg.subtle': {
          value: { _light: '#8c959f', _dark: '#6e7681' },
        },
        'bg.panel': {
          value: { _light: '#ffffff', _dark: '#161b22' },
        },
        'bg.panelHover': {
          value: { _light: '#f0f3f6', _dark: '#1c2128' },
        },
        'bg.input': {
          value: { _light: '#f0f3f6', _dark: '#0d1117' },
        },
        'bg.elevated': {
          value: { _light: '#ffffff', _dark: '#161b22' },
        },
        'bg.sidebar': {
          value: { _light: '#ffffff', _dark: '#010409' },
        },
        'bg.navbar': {
          value: { _light: '#ffffff', _dark: '#161b22' },
        },
        'bg.navActive': {
          value: 'var(--nav-active-bg, rgba(56, 139, 253, 0.12))',
        },
        'border.subtle': {
          value: { _light: '#d8dee4', _dark: '#30363d' },
        },
        'border.strong': {
          value: { _light: '#c4cdd5', _dark: '#484f58' },
        },
        brand: {
          value: 'var(--app-accent)',
        },
        'brand.emphasis': {
          value: 'var(--brand-emphasis, var(--app-accent))',
        },
        accent: {
          value: 'var(--app-accent)',
        },
        'nav.active': {
          value: 'var(--app-accent)',
        },
        'nav.activeFg': {
          value: 'var(--nav-active-fg, var(--app-accent))',
        },
      },
    },
  },
})

export const appSystem = createSystem(defaultConfig, customConfig)
