import { ChakraProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { ThemeSettingsDrawer } from '../components/theme/ThemeSettingsDrawer'
import { ThemeSync } from '../components/theme/ThemeSync'
import { appSystem } from '../theme/system'
import { useThemeStore } from '../stores/theme-store'

function initTheme() {
  useThemeStore.getState().applyAll()
}

initTheme()

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
        <ThemeSync />
        <ThemeSettingsDrawer />
        {children}
      </ChakraProvider>
    </QueryClientProvider>
  )
}
