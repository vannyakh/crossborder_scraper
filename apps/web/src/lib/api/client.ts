import { getBasicAuthHeader, useAuthStore } from '../../stores/auth-store'

export type AuthStatus = {
  auth_enabled: boolean
  auth_configured: boolean
  login_required: boolean
}

export type LoginResponse = {
  ok: boolean
  username: string
  message: string
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: {
      'content-type': 'application/json',
      ...getBasicAuthHeader(),
      ...(init?.headers || {}),
    },
    ...init,
  })
  const ct = res.headers.get('content-type') || ''
  const data = ct.includes('application/json') ? await res.json() : await res.text()

  if (res.status === 401) {
    useAuthStore.getState().logout()
  }

  if (!res.ok) {
    const detail =
      typeof data === 'object' && data !== null && 'detail' in data
        ? JSON.stringify((data as { detail: unknown }).detail)
        : JSON.stringify(data)
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${detail}`)
  }
  return data as T
}

/** Multipart upload (e.g. skill/plugin ZIP) — do not set Content-Type; browser sets boundary. */
export async function apiFormData<T>(path: string, form: FormData, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    method: init?.method ?? 'POST',
    body: form,
    headers: {
      ...getBasicAuthHeader(),
      ...(init?.headers || {}),
    },
  })
  const ct = res.headers.get('content-type') || ''
  const data = ct.includes('application/json') ? await res.json() : await res.text()

  if (res.status === 401) {
    useAuthStore.getState().logout()
  }

  if (!res.ok) {
    const detail =
      typeof data === 'object' && data !== null && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : JSON.stringify(data)
    throw new Error(detail || res.statusText)
  }
  return data as T
}

/** Public — no credentials required */
export async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
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

export async function checkHealth(): Promise<{
  status: string
  version?: string
  auth_enabled?: boolean
  auth_configured?: boolean
}> {
  return publicApi('/health')
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  return publicApi<AuthStatus>('/auth/status')
}

export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  return publicApi<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}
