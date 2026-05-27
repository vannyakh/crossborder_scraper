import { Badge, Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { ExternalLink } from 'lucide-react'
import { StatusBadge } from '../ui/StatusBadge'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { SkillRegistryItem } from '../../lib/api'

function registryStatus(item: SkillRegistryItem): { tone: 'success' | 'neutral' | 'running'; label: string } {
  if (item.enabled) return { tone: 'success', label: 'enabled' }
  if (item.installed) return { tone: 'running', label: 'installed' }
  if (item.kind === 'plugin') return { tone: 'neutral', label: 'plugin' }
  return { tone: 'neutral', label: 'available' }
}

export function SkillRegistryActions({
  item,
  installing,
  busy,
  onInstall,
  onUpdate,
  onEnable,
  onOpenLocal,
}: {
  item: SkillRegistryItem
  installing: boolean
  busy: boolean
  onInstall: (slug: string, version: string) => void
  onUpdate: (slug: string, version: string) => void
  onEnable: (slug: string) => void
  onOpenLocal: (slug: string) => void
}) {
  const accentPalette = useAccentPalette()

  if (item.kind === 'plugin') {
    return (
      <VStack align="stretch" gap={1.5} w="full">
        <Button
          size="sm"
          width="full"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="var(--radius-input)"
          asChild
        >
          <a href={item.registry_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} />
            View on registry
          </a>
        </Button>
        <Text fontSize="xs" color="fg.subtle" textAlign="center" lineHeight="short">
          Runtime plugins install on external agent hosts — not SKILL.md packages.
        </Text>
      </VStack>
    )
  }

  if (item.installed) {
    return (
      <VStack align="stretch" gap={1.5} w="full">
        <HStack gap={2} w="full">
          <Button
            size="sm"
            flex={1}
            colorPalette={accentPalette}
            borderRadius="var(--radius-input)"
            disabled={busy || item.enabled}
            onClick={() => onEnable(item.slug)}
          >
            {item.enabled ? 'Enabled' : 'Enable'}
          </Button>
          <Button
            size="sm"
            flex={1}
            variant="outline"
            borderColor="border.subtle"
            borderRadius="var(--radius-input)"
            disabled={busy}
            loading={installing}
            onClick={() => onUpdate(item.slug, item.version)}
          >
            Update
          </Button>
        </HStack>
        <Button
          size="sm"
          width="full"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="var(--radius-input)"
          onClick={() => onOpenLocal(item.slug)}
        >
          Details
        </Button>
      </VStack>
    )
  }

  return (
    <Button
      size="sm"
      width="full"
      colorPalette={accentPalette}
      borderRadius="var(--radius-input)"
      loading={installing}
      disabled={busy}
      onClick={() => onInstall(item.slug, item.version)}
    >
      Install
    </Button>
  )
}

export function SkillRegistryCard({
  item,
  installing,
  busy,
  onInstall,
  onUpdate,
  onEnable,
  onOpenLocal,
}: {
  item: SkillRegistryItem
  installing: boolean
  busy: boolean
  onInstall: (slug: string, version: string) => void
  onUpdate: (slug: string, version: string) => void
  onEnable: (slug: string) => void
  onOpenLocal: (slug: string) => void
}) {
  const status = registryStatus(item)

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
          <Box minW={0}>
            <Text fontWeight="semibold" lineClamp={1}>
              {item.name}
            </Text>
            <Text fontSize="xs" color="fg.muted" lineClamp={1}>
              {item.owner_handle ? `@${item.owner_handle}` : item.slug} · v{item.version}
            </Text>
          </Box>
          <StatusBadge status={status.tone} label={status.label} />
        </HStack>

        <Text fontSize="sm" color="fg.muted" lineClamp={3} minH="3.6em" title={item.description}>
          {item.description}
        </Text>

        <HStack mt={2} gap={1} flexWrap="wrap">
          <Badge size="sm" variant="subtle" textTransform="none">
            {item.kind}
          </Badge>
          {item.is_official ? (
            <Badge size="sm" colorPalette="green" variant="subtle" textTransform="none">
              official
            </Badge>
          ) : null}
          {item.executes_code ? (
            <Badge size="sm" colorPalette="orange" variant="subtle" textTransform="none">
              executes code
            </Badge>
          ) : null}
          {item.kind === 'skill' && item.downloads > 0 ? (
            <Text fontSize="xs" color="fg.subtle">
              {item.downloads.toLocaleString()} downloads
            </Text>
          ) : null}
        </HStack>
      </Box>

      <Box px={4} py={3} borderTopWidth="1px" borderColor="border.subtle" bg="bg.panelHover">
        <SkillRegistryActions
          item={item}
          installing={installing}
          busy={busy}
          onInstall={onInstall}
          onUpdate={onUpdate}
          onEnable={onEnable}
          onOpenLocal={onOpenLocal}
        />
      </Box>
    </Box>
  )
}
