import { Toaster } from 'react-hot-toast'

const toastStyle = {
  background: 'var(--flyout-bg)',
  color: 'var(--app-fg)',
  border: '1px solid var(--app-border, rgba(128, 128, 128, 0.25))',
  borderRadius: 'var(--radius-input)',
  fontSize: '0.875rem',
  boxShadow: 'var(--flyout-shadow)',
  maxWidth: 'min(24rem, calc(100vw - 2rem))',
} as const

/** Global toast host — mount once under `AppProviders`. */
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerClassName="app-toast-host"
      toastOptions={{
        style: toastStyle,
        success: {
          duration: 3500,
          iconTheme: {
            primary: 'var(--app-accent)',
            secondary: 'var(--flyout-bg)',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ef4444',
            secondary: 'var(--flyout-bg)',
          },
        },
      }}
    />
  )
}
