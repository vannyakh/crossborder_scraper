import { ChakraProvider, LocaleProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { LocaleSync } from '../components/locale/LocaleSync'
import { ThemeSettingsDrawer } from '../components/theme/ThemeSettingsDrawer'
import { ThemeSync } from '../components/theme/ThemeSync'
import { localeToTag } from '../locale/config'
import { useLocaleStore } from '../stores/locale-store'
import { appSystem } from '../theme/system'
import { useThemeStore } from '../stores/theme-store'

function initTheme() {
  useThemeStore.getState().applyAll()
}

initTheme()

function LocaleBridge({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((state) => state.locale)

  return (
    <LocaleProvider locale={localeToTag(locale)}>
      <LocaleSync />
      {children}
    </LocaleProvider>
  )
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={appSystem}>
        <LocaleBridge>
          <ThemeSync />
          <ThemeSettingsDrawer />
          {children}
        </LocaleBridge>
      </ChakraProvider>
    </QueryClientProvider>
  )
}
