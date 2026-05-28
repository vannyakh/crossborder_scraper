import hotToast, { type ToastOptions } from 'react-hot-toast'

const baseOptions: ToastOptions = {
  duration: 4000,
}

function errorMessage(err: unknown): string {
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message || 'Something went wrong'
  return String(err || 'Something went wrong')
}

/** Infer error toasts from common API / save-bar message text. */
export function isErrorToastMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    message.includes('HTTP') ||
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('invalid')
  )
}

export const toast = hotToast

export function notify(message: string, options?: ToastOptions) {
  return hotToast(message, { ...baseOptions, ...options })
}

export function notifySuccess(message: string, options?: ToastOptions) {
  return hotToast.success(message, { ...baseOptions, ...options })
}

export function notifyError(err: unknown, options?: ToastOptions) {
  return hotToast.error(errorMessage(err), { ...baseOptions, duration: 5000, ...options })
}

/** Show success or error based on message heuristics (settings save bar, etc.). */
export function notifyOutcome(message: string, options?: ToastOptions) {
  if (!message.trim()) return
  if (isErrorToastMessage(message)) return notifyError(message, options)
  return notifySuccess(message, options)
}
