import { Badge, Box, HStack, Text } from '@chakra-ui/react'
import { StatusBadge } from '../ui/StatusBadge'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreCatalogItem, StoreEnvironment } from '../../lib/api'
import { StoreCatalogActions } from './StoreCatalogActions'
import { pluginIcon, statusTone, STORE_CATEGORY_LABEL } from './store-utils'
import { PluginScrapeSpecSummary } from './PluginScrapeSpecPanel'

export function StoreCatalogListRow({
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
  const Icon = pluginIcon(item.id)

  return (
    <Box
      display="flex"
      flexDirection={{ base: 'column', lg: 'row' }}
      alignItems={{ base: 'stretch', lg: 'center' }}
      gap={{ base: 3, lg: 4 }}
      p={4}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      _last={{ borderBottomWidth: 0 }}
      _hover={{ bg: 'bg.panelHover' }}
    >
      <HStack flex={1} minW={0} align="start" gap={3}>
        <Box
          p={2}
          borderRadius="var(--radius-card)"
          colorPalette={accentPalette}
          bg="colorPalette.subtle"
          color="colorPalette.fg"
          flexShrink={0}
        >
          <Icon size={18} strokeWidth={2} />
        </Box>
        <Box minW={0} flex={1}>
          <HStack justify="space-between" gap={2} flexWrap="wrap">
            <Box minW={0}>
              <Text fontWeight="semibold" lineClamp={1}>
                {item.name}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {STORE_CATEGORY_LABEL[item.category] ?? item.category} · v{item.version} · port{' '}
                {item.default_port}
              </Text>
            </Box>
            <StatusBadge
              status={statusTone(item.status)}
              label={item.installed ? item.status : 'available'}
            />
          </HStack>
          <Text mt={1} fontSize="sm" color="fg.muted" lineClamp={1} title={item.description}>
            {item.description}
          </Text>
          {item.scrape_spec ? <PluginScrapeSpecSummary spec={item.scrape_spec} /> : null}
          <HStack mt={1.5} gap={1} flexWrap="wrap">
            {item.tags.map((tag) => (
              <Badge key={tag} size="sm" variant="subtle" textTransform="none">
                {tag}
              </Badge>
            ))}
            {item.supports_native ? (
              <Text fontSize="xs" color="fg.subtle">
                host driver
              </Text>
            ) : item.docker_image ? (
              <Text fontSize="xs" color="fg.subtle" fontFamily="mono" lineClamp={1}>
                {item.docker_image}
              </Text>
            ) : null}
          </HStack>
        </Box>
      </HStack>

      <Box flexShrink={0} w={{ base: 'full', lg: '200px' }}>
        <StoreCatalogActions
          item={item}
          env={env}
          installing={installing}
          onInstall={onInstall}
          onSettings={onSettings}
        />
      </Box>
    </Box>
  )
}
