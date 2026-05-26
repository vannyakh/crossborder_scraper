import { Button, Text, VStack } from '@chakra-ui/react'
import { Settings } from 'lucide-react'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreCatalogItem } from '../../lib/api'

export function StoreCatalogActions({
  item,
  dockerReady,
  installing,
  onInstall,
  onSettings,
}: {
  item: StoreCatalogItem
  dockerReady: boolean
  installing: boolean
  onInstall: (id: string, port: number) => void
  onSettings: (id: string) => void
}) {
  const accentPalette = useAccentPalette()

  if (item.installed) {
    return (
      <Button
        size="sm"
        width="full"
        variant="outline"
        borderColor="border.subtle"
        borderRadius="var(--radius-input)"
        onClick={() => onSettings(item.id)}
      >
        <Settings size={14} />
        Settings
      </Button>
    )
  }

  const canInstall = item.supports_docker && dockerReady

  return (
    <VStack align="stretch" gap={1.5} w="full">
      <Button
        size="sm"
        width="full"
        colorPalette={accentPalette}
        borderRadius="var(--radius-input)"
        disabled={!canInstall}
        loading={installing}
        onClick={() => onInstall(item.id, item.default_port)}
      >
        Install
      </Button>
      {item.supports_docker && !dockerReady ? (
        <Text fontSize="xs" color="fg.subtle" textAlign="center">
          Docker required for one-click install.
        </Text>
      ) : null}
    </VStack>
  )
}
