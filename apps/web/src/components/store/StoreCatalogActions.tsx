import { Button, Text, VStack } from '@chakra-ui/react'
import { Settings } from 'lucide-react'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreCatalogItem, StoreEnvironment } from '../../lib/api'

export function StoreCatalogActions({
  item,
  env,
  installing,
  onInstall,
  onSettings,
}: {
  item: StoreCatalogItem
  env?: StoreEnvironment
  installing: boolean
  onInstall: (id: string) => void
  onSettings: (id: string) => void
}) {
  const accentPalette = useAccentPalette()
  const isSource =
    item.kind === 'source' ||
    item.kind === 'site' ||
    item.category === 'ecommerce' ||
    item.category === 'social' ||
    item.category === 'custom'

  if (item.installed || item.scrape_spec) {
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
        {item.scrape_spec && !item.installed ? 'Specification' : 'Settings'}
      </Button>
    )
  }

  const nativeReady = Boolean(env?.native_driver_available)
  const dockerReady = Boolean(env?.docker_available && env?.compose_available)
  const canInstall =
    isSource || (item.supports_native && nativeReady) || (item.supports_docker && dockerReady)

  return (
    <VStack align="stretch" gap={1.5} w="full">
      <Button
        size="sm"
        width="full"
        colorPalette={accentPalette}
        borderRadius="var(--radius-input)"
        disabled={!canInstall}
        loading={installing}
        onClick={() => onInstall(item.id)}
      >
        {isSource ? 'Enable' : 'Install'}
      </Button>
      {!isSource && !canInstall ? (
        <Text fontSize="xs" color="fg.subtle" textAlign="center">
          Install on a Linux VPS (host driver) or install Docker for container setup.
        </Text>
      ) : null}
      {!isSource && canInstall && item.supports_native && nativeReady ? (
        <Text fontSize="xs" color="fg.subtle" textAlign="center">
          Host driver install with version selection
        </Text>
      ) : null}
      {isSource && item.domains?.length ? (
        <Text fontSize="xs" color="fg.subtle" textAlign="center" lineClamp={2} title={item.domains.join(', ')}>
          {item.domains.join(' · ')}
        </Text>
      ) : null}
    </VStack>
  )
}
