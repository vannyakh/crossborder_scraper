import { getBasicAuthHeader, useAuthStore } from '../../stores/auth-store'
import { withPanelPrefix } from './panel-prefix'

export function formatApiDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((entry) => {
        const row = entry as { loc?: (string | number)[]; msg?: string }
        const field = row.loc?.length ? String(row.loc[row.loc.length - 1]) : 'field'
        return `${row.msg ?? 'invalid'} (${field})`
      })
      .join('; ')
  }
  if (detail && typeof detail === 'object') {
    const row = detail as { message?: string }
    if (typeof row.message === 'string' && row.message.trim()) {
      return row.message
    }
    try {
      return JSON.stringify(detail)
    } catch {
      return 'Request failed'
    }
  }
  return 'Request failed'
}

export type AuthStatus = {
  auth_enabled: boolean
  auth_configured: boolean
  login_required: boolean
  captcha_required?: boolean
}

export type LoginResponse = {
  ok: boolean
  username: string
  message: string
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withPanelPrefix(path), {
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
    const detail = formatApiDetail(
      typeof data === 'object' && data !== null && 'detail' in data
        ? (data as { detail: unknown }).detail
        : data,
    )
    throw new Error(detail || `${res.status} ${res.statusText}`)
  }
  return data as T
}

/** Multipart upload (e.g. skill/plugin ZIP) — do not set Content-Type; browser sets boundary. */
export async function apiFormData<T>(path: string, form: FormData, init?: RequestInit): Promise<T> {
  const res = await fetch(withPanelPrefix(path), {
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
  const res = await fetch(withPanelPrefix(path), {
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

export { fetchAuthStatus, loginRequest } from './auth'
export type { CaptchaChallenge, LoginPayload } from './auth'
