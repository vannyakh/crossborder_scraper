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

  const canInstall = isSource || (item.supports_docker && dockerReady)

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
        {isSource ? 'Enable' : 'Install'}
      </Button>
      {item.supports_docker && !dockerReady && !isSource ? (
        <Text fontSize="xs" color="fg.subtle" textAlign="center">
          Docker required for one-click install.
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
