import { Badge, Box, HStack, Text } from '@chakra-ui/react'
import { StatusBadge } from '../ui/StatusBadge'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreCatalogItem } from '../../lib/api'
import { StoreCatalogActions } from './StoreCatalogActions'
import { pluginIcon, statusTone, STORE_CATEGORY_LABEL } from './store-utils'

export function StoreCatalogCard({
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
          {item.tags.map((tag) => (
            <Badge key={tag} size="sm" variant="subtle" textTransform="none">
              {tag}
            </Badge>
          ))}
        </HStack>

        <Text mt={2} fontSize="xs" color="fg.subtle" fontFamily="mono" lineClamp={1} title={item.docker_image}>
          {item.docker_image}
        </Text>
      </Box>

      <Box px={4} py={3} borderTopWidth="1px" borderColor="border.subtle" bg="bg.panelHover">
        <StoreCatalogActions
          item={item}
          dockerReady={dockerReady}
          installing={installing}
          onInstall={onInstall}
          onSettings={onSettings}
        />
      </Box>
    </Box>
  )
}
