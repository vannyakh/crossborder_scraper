import { ChakraProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { ThemeSync } from '../components/theme/ThemeSync'
import { appSystem } from '../theme/system'
import { applyColorModeToDocument, resolveColorMode, useThemeStore } from '../stores/theme-store'

function initTheme() {
  const mode = useThemeStore.getState().mode
  const resolved = resolveColorMode(mode)
  useThemeStore.getState().setResolved(resolved)
  applyColorModeToDocument(resolved)
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
        {children}
      </ChakraProvider>
    </QueryClientProvider>
  )
}
