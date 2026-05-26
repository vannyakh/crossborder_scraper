import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const customConfig = defineConfig({
  globalCss: {
    html: {
      bg: 'canvas',
    },
    body: {
      bg: 'canvas',
      color: 'fg',
      minH: '100dvh',
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: "'Outfit', ui-sans-serif, system-ui, sans-serif" },
        body: { value: "'DM Sans', ui-sans-serif, system-ui, sans-serif" },
        mono: {
          value: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
        },
      },
      radii: {
        panel: { value: '1.25rem' },
        card: { value: '1rem' },
        input: { value: '0.75rem' },
        pill: { value: '9999px' },
      },
      colors: {
        brand: {
          50: { value: '#faf5ff' },
          100: { value: '#f3e8ff' },
          200: { value: '#e9d5ff' },
          300: { value: '#d8b4fe' },
          400: { value: '#c084fc' },
          500: { value: '#a855f7' },
          600: { value: '#9333ea' },
          700: { value: '#7e22ce' },
        },
      },
    },
    semanticTokens: {
      colors: {
        canvas: {
          value: { _light: '#f4f6fb', _dark: '#050810' },
        },
        fg: {
          value: { _light: '#0f172a', _dark: '#e8eef9' },
        },
        'fg.muted': {
          value: { _light: '#475569', _dark: '#94a3b8' },
        },
        'fg.subtle': {
          value: { _light: '#64748b', _dark: '#64748b' },
        },
        'bg.panel': {
          value: { _light: '#ffffff', _dark: '#0e1528' },
        },
        'bg.panelHover': {
          value: { _light: '#f8fafc', _dark: '#151f38' },
        },
        'bg.input': {
          value: { _light: '#f1f5f9', _dark: 'rgba(0, 0, 0, 0.28)' },
        },
        'bg.elevated': {
          value: { _light: 'rgba(15, 23, 42, 0.04)', _dark: 'rgba(255, 255, 255, 0.04)' },
        },
        'bg.sidebar': {
          value: { _light: 'rgba(255, 255, 255, 0.9)', _dark: 'rgba(8, 12, 24, 0.88)' },
        },
        'border.subtle': {
          value: { _light: 'rgba(15, 23, 42, 0.1)', _dark: 'rgba(148, 163, 184, 0.14)' },
        },
        'border.strong': {
          value: { _light: 'rgba(15, 23, 42, 0.16)', _dark: 'rgba(148, 163, 184, 0.22)' },
        },
        brand: {
          value: { _light: '{colors.purple.600}', _dark: '{colors.brand.500}' },
        },
        'brand.emphasis': {
          value: { _light: '{colors.purple.500}', _dark: '{colors.brand.400}' },
        },
        accent: {
          value: { _light: '#0891b2', _dark: '#22d3ee' },
        },
        'nav.active': {
          value: { _light: '{colors.purple.600}', _dark: '{colors.purple.600}' },
        },
        'nav.activeFg': {
          value: { _light: '#ffffff', _dark: '#ffffff' },
        },
        'shadow.panel': {
          value: {
            _light: '0 16px 40px rgba(15, 23, 42, 0.08)',
            _dark: '0 20px 50px rgba(0, 0, 0, 0.38)',
          },
        },
      },
    },
  },
})

export const appSystem = createSystem(defaultConfig, customConfig)
