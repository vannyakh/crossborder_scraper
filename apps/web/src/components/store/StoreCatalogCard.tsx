import { Badge, Box, HStack, Text } from '@chakra-ui/react'
import { StatusBadge } from '../ui/StatusBadge'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreCatalogItem, StoreEnvironment } from '../../lib/api'
import { StoreCatalogActions } from './StoreCatalogActions'
import { pluginIcon, statusTone, STORE_CATEGORY_LABEL } from './store-utils'
import { PluginScrapeSpecSummary } from './PluginScrapeSpecPanel'

export function StoreCatalogCard({
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
      flexDirection="column"
      h="full"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-panel)"
      bg="bg.elevated"
      overflow="hidden"
      transition="border-color var(--motion-duration)"
      _hover={{ borderColor: 'border.default' }}
    >
      <Box p={4} flex={1}>
        <HStack justify="space-between" align="start" gap={3} mb={3}>
          <HStack align="start" gap={3} minW={0}>
            <Box
              p={2}
              borderRadius="var(--radius-card)"
              colorPalette={accentPalette}
              bg="colorPalette.subtle"
              color="colorPalette.fg"
              flexShrink={0}
            >
              <Icon size={20} strokeWidth={2} />
            </Box>
            <Box minW={0}>
              <Text fontWeight="semibold" lineClamp={1}>
                {item.name}
              </Text>
              <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                {STORE_CATEGORY_LABEL[item.category] ?? item.category} · v{item.version}
              </Text>
            </Box>
          </HStack>
          <StatusBadge
            status={statusTone(item.status)}
            label={item.installed ? item.status : 'available'}
          />
        </HStack>

        <Text fontSize="sm" color="fg.muted" lineClamp={2} minH="2.75em" title={item.description}>
          {item.description}
        </Text>

        <HStack mt={2} gap={1} flexWrap="wrap">
          {item.kind === 'site' ? (
            <Badge size="sm" colorPalette="green" variant="subtle" textTransform="none">
              built-in site
            </Badge>
          ) : null}
          {item.sandboxed ? (
            <Badge size="sm" colorPalette="orange" variant="subtle" textTransform="none">
              sandboxed
            </Badge>
          ) : null}
          {item.tags.map((tag) => (
            <Badge key={tag} size="sm" variant="subtle" textTransform="none">
              {tag}
            </Badge>
          ))}
        </HStack>

        {item.scrape_spec ? <PluginScrapeSpecSummary spec={item.scrape_spec} /> : null}

        {item.supports_native ? (
          <Text mt={2} fontSize="xs" color="fg.subtle">
            Host driver · v{item.default_version || item.version}
            {item.available_versions && item.available_versions.length > 1
              ? ` (${item.available_versions.join(', ')})`
              : ''}
          </Text>
        ) : item.docker_image ? (
          <Text
            mt={2}
            fontSize="xs"
            color="fg.subtle"
            fontFamily="mono"
            lineClamp={1}
            title={item.docker_image}
          >
            {item.docker_image}
          </Text>
        ) : item.domains?.length ? (
          <Text
            mt={2}
            fontSize="xs"
            color="fg.subtle"
            lineClamp={1}
            title={item.domains.join(', ')}
          >
            {item.domains.join(' · ')}
          </Text>
        ) : null}
      </Box>

      <Box px={4} py={3} borderTopWidth="1px" borderColor="border.subtle" bg="bg.panelHover">
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
