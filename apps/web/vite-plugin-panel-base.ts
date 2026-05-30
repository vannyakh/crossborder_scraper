import type { Plugin } from 'vite'

const ENTRANCE_PREFIX_RE = /^\/[a-f0-9]{8}(?:\/|$)/
const VITE_INTERNAL_PREFIXES = ['/@vite', '/@fs', '/@id', '/__vite', '/node_modules', '/src']

function isApiProxyPath(pathname: string, apiProxyPaths: readonly string[]): boolean {
  for (const apiPath of apiProxyPaths) {
    if (pathname === apiPath || pathname.startsWith(`${apiPath}/`)) return true
  }
  return false
}

/** API paths proxied at repo root in dev — must not be redirected to /ui. */
export function panelUiRedirectTarget(
  pathname: string,
  apiProxyPaths: readonly string[],
  entrancePrefix?: string,
): string | null {
  const path = pathname || '/'

  if (path === '/ui' || path === '/ui/') {
    return path.endsWith('/') ? null : '/ui/'
  }

  const entrance = path.match(/^\/([a-f0-9]{8})(\/.*)?$/)
  if (entrance) {
    const hex = entrance[1]
    const rest = entrance[2] ?? ''
    if (!entrancePrefix) {
      if (rest.startsWith('/ui/') || rest === '/ui') return null
      if (isApiProxyPath(rest, apiProxyPaths)) return null
      if (rest === '' || rest === '/') return '/ui/'
      return `/ui${rest}`
    }
    if (rest === '' || rest === '/') return `/${hex}/ui/`
    if (rest === '/ui') return `/${hex}/ui/`
    if (rest.startsWith('/ui/')) return null
    if (isApiProxyPath(rest, apiProxyPaths)) return null
    return `/${hex}/ui${rest}`
  }

  if (path.startsWith('/ui/')) return null

  if (path === '/') return '/ui/'

  for (const prefix of VITE_INTERNAL_PREFIXES) {
    if (path.startsWith(prefix)) return null
  }

  if (isApiProxyPath(path, apiProxyPaths)) return null

  if (path.startsWith('/ui')) return '/ui/'

  return `/ui${path}`
}

export function panelUiBaseRedirectPlugin(
  apiProxyPaths: readonly string[],
  entrancePrefix?: string,
): Plugin {
  return {
    name: 'panel-ui-base-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url ?? '/'
        const q = raw.includes('?') ? raw.slice(raw.indexOf('?')) : ''
        const pathname = raw.split('?')[0] || '/'
        const target = panelUiRedirectTarget(pathname, apiProxyPaths, entrancePrefix)
        if (!target) {
          next()
          return
        }
        res.statusCode = 302
        res.setHeader('Location', `${target}${q}`)
        res.end()
      })
    },
  }
}

export function isPanelAppPath(pathname: string): boolean {
  if (pathname.startsWith('/ui/') || pathname === '/ui') return true
  if (!ENTRANCE_PREFIX_RE.test(pathname)) return false
  const rest = pathname.replace(/^\/[a-f0-9]{8}/, '')
  return rest === '' || rest === '/' || rest.startsWith('/ui')
}
