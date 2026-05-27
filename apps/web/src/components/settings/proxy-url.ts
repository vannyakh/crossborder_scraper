export type ProxyScheme = 'http' | 'https' | 'socks5'

export type ParsedProxy = {
  scheme: ProxyScheme
  host: string
  port: string
  username: string
  password: string
}

const DEFAULT_PARSED: ParsedProxy = {
  scheme: 'http',
  host: '',
  port: '',
  username: '',
  password: '',
}

export function parseProxyLine(line: string): ParsedProxy | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  if (trimmed.includes('@') && !trimmed.split('@', 1)[0].includes('://')) {
    const at = trimmed.lastIndexOf('@')
    const creds = trimmed.slice(0, at)
    const hostPart = trimmed.slice(at + 1)
    const colon = creds.indexOf(':')
    const username = colon >= 0 ? creds.slice(0, colon) : creds
    const password = colon >= 0 ? creds.slice(colon + 1) : ''
    const hostColon = hostPart.lastIndexOf(':')
    const host = hostColon >= 0 ? hostPart.slice(0, hostColon) : hostPart
    const port = hostColon >= 0 ? hostPart.slice(hostColon + 1) : '8080'
    return { scheme: 'http', host, port, username, password }
  }

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `http://${trimmed}`)
    const rawScheme = url.protocol.replace(':', '')
    const scheme: ProxyScheme =
      rawScheme === 'socks5' || rawScheme === 'https' || rawScheme === 'http' ? rawScheme : 'http'
    return {
      scheme,
      host: url.hostname,
      port: url.port || (scheme === 'https' ? '443' : '80'),
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    }
  } catch {
    return null
  }
}

export function buildProxyLine(parts: ParsedProxy): string {
  const host = parts.host.trim()
  if (!host) return ''
  const port = parts.port.trim() || (parts.scheme === 'https' ? '443' : '8080')
  const auth =
    parts.username.trim() || parts.password
      ? `${encodeURIComponent(parts.username.trim())}:${encodeURIComponent(parts.password)}@`
      : ''
  return `${parts.scheme}://${auth}${host}:${port}`
}

export function emptyParsedProxy(): ParsedProxy {
  return { ...DEFAULT_PARSED }
}
