import { formatApiDetail, publicApi, type AuthStatus, type LoginResponse } from './client'
import { withPanelPrefix } from './panel-prefix'

export type CaptchaKind = 'image' | 'audio'

export type CaptchaChallenge = {
  captcha_id: string
  kind: CaptchaKind
  media_base64: string
  mime_type: string
}

export type LoginPayload = {
  username: string
  password: string
  captcha_id?: string
  captcha_answer?: string
}

export type LoginFailureDetail = {
  message: string
  captcha_required?: boolean
}

export class LoginRequestError extends Error {
  captcha_required: boolean

  constructor(message: string, captcha_required = false) {
    super(message)
    this.name = 'LoginRequestError'
    this.captcha_required = captcha_required
  }
}

function parseLoginFailure(data: unknown): LoginFailureDetail {
  if (typeof data === 'object' && data !== null && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail
    if (typeof detail === 'object' && detail !== null && 'message' in detail) {
      const row = detail as LoginFailureDetail
      return {
        message: String(row.message),
        captcha_required: Boolean(row.captcha_required),
      }
    }
    return { message: formatApiDetail(detail), captcha_required: false }
  }
  return { message: 'Sign in failed', captcha_required: false }
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  return publicApi<AuthStatus>('/auth/status')
}

export async function fetchLoginCaptcha(): Promise<CaptchaChallenge> {
  return publicApi<CaptchaChallenge>('/auth/captcha')
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const res = await fetch(withPanelPrefix('/auth/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const ct = res.headers.get('content-type') || ''
  const data = ct.includes('application/json') ? await res.json() : await res.text()

  if (!res.ok) {
    const failure = parseLoginFailure(typeof data === 'object' ? data : { detail: data })
    throw new LoginRequestError(failure.message, failure.captcha_required)
  }
  return data as LoginResponse
}
