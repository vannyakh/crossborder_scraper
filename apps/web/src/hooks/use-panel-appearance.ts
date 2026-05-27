import { useEffect } from 'react'
import { DEFAULT_PANEL_FAVICON_URL } from '../theme/panel-appearance'
import { useThemeStore } from '../stores/theme-store'

/** Applies branding from theme store (favicon, etc.). */
export function usePanelAppearance() {
  const branding = useThemeStore((s) => s.config.branding)

  useEffect(() => {
    const href = branding.faviconUrl ?? DEFAULT_PANEL_FAVICON_URL
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = href
    if (!branding.faviconUrl) {
      link.type = 'image/svg+xml'
    }
  }, [branding.faviconUrl])
}
