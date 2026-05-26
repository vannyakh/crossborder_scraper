import { useAuthStore } from '../../stores/auth-store'

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().accessToken
  const res = await fetch(path, {
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  })
  const ct = res.headers.get('content-type') || ''
  const data = ct.includes('application/json') ? await res.json() : await res.text()
  if (!res.ok) {
    const detail =
      typeof data === 'object' && data !== null && 'detail' in data
        ? JSON.stringify((data as { detail: unknown }).detail)
        : JSON.stringify(data)
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${detail}`)
  }
  return data as T
}

export async function checkHealth(): Promise<{ status: string }> {
  return api<{ status: string }>('/health')
}
