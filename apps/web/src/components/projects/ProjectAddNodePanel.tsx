import { Box, Button, HStack, IconButton, Input, Text, VStack } from '@chakra-ui/react'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { NODE_VISUAL, roleForKind } from './project-node-meta'
import {
  PROJECT_NODE_PALETTE,
  PROJECT_PALETTE_CATEGORIES,
  type ProjectPaletteCategory,
} from './project-node-palette'
import type { ProjectNodeKind } from './project-sample-data'

export function ProjectAddNodePanel({
  onClose,
  onPick,
  pluginMode = false,
}: {
  onClose: () => void
  onPick: (kind: ProjectNodeKind) => void
  /** When true: shows only data/service nodes (for wiring to agent slots). */
  pluginMode?: boolean
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const [filter, setFilter] = useState('')
  const [category, setCategory] = useState<ProjectPaletteCategory | 'all'>(
    pluginMode ? 'data' : 'all',
  )

  const entries = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return PROJECT_NODE_PALETTE.filter((item) => {
      if (pluginMode && item.category !== 'data') return false
      if (!pluginMode && category !== 'all' && item.category !== category) return false
      if (!q) return true
      const label = t(item.labelKey).toLowerCase()
      const desc = t(item.descKey).toLowerCase()
      const kind = item.kind.toLowerCase()
      return label.includes(q) || desc.includes(q) || kind.includes(q)
    })
  }, [category, filter, pluginMode, t])

  return (
    <Box className="project-add-node-panel" role="dialog" aria-label={t('projects.addNode.title')}>
      <Box className="project-add-node-panel__header">
        <Box minW={0} flex={1}>
          <Text fontWeight="semibold" fontSize="lg">
            {pluginMode ? t('projects.addNode.pluginTitle') : t('projects.addNode.title')}
          </Text>
          <Text fontSize="sm" color="fg.muted" mt={0.5}>
            {pluginMode ? t('projects.addNode.pluginHint') : t('projects.addNode.hint')}
          </Text>
        </Box>
        <IconButton
          aria-label={t('projects.addNode.close')}
          size="sm"
          variant="ghost"
          onClick={onClose}
        >
          <X size={18} />
        </IconButton>
      </Box>

      {!pluginMode ? (
        <HStack
          className="project-add-node-panel__categories"
          gap={1}
          px={3}
          py={2}
          borderBottomWidth="1px"
          borderColor="border.subtle"
          overflowX="auto"
        >
          {PROJECT_PALETTE_CATEGORIES.map((item) => (
            <Button
              key={item.id}
              size="xs"
              variant={category === item.id ? 'subtle' : 'ghost'}
              colorPalette={category === item.id ? accentPalette : undefined}
              flexShrink={0}
              onClick={() => setCategory(item.id)}
            >
              {t(item.labelKey)}
            </Button>
          ))}
        </HStack>
      ) : null}

      <Box px={3} py={2} borderBottomWidth="1px" borderColor="border.subtle">
        <Input
          size="sm"
          placeholder={t('projects.addNode.filterPlaceholder')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </Box>

      <Box className="project-add-node-panel__body app-scroll" flex={1} minH={0} px={3} py={3}>
        {entries.length === 0 ? (
          <Text fontSize="sm" color="fg.muted" px={1} py={6} textAlign="center">
            {t('projects.addNode.noMatches')}
          </Text>
        ) : (
          <VStack align="stretch" gap={2}>
            {entries.map((item) => {
              const meta = NODE_VISUAL[item.kind]
              const Icon = meta.icon
              const role = roleForKind(item.kind)
              return (
                <button
                  key={item.kind}
                  type="button"
                  className="project-add-node-card"
                  onClick={() => onPick(item.kind)}
                >
                  <HStack align="flex-start" gap={3} w="full">
                    <Box
                      className="project-add-node-card__icon"
                      style={{ background: meta.iconBg, color: meta.iconColor }}
                    >
                      <Icon size={20} strokeWidth={1.75} />
                    </Box>
                    <Box minW={0} flex={1} textAlign="left">
                      <HStack gap={2} flexWrap="wrap">
                        <Text fontWeight="semibold" fontSize="sm">
                          {t(item.labelKey)}
                        </Text>
                        <Text
                          as="span"
                          fontSize="2xs"
                          fontWeight="medium"
                          px={1.5}
                          py={0.5}
                          borderRadius="sm"
                          bg="bg.muted"
                          color="fg.muted"
                          textTransform="uppercase"
                          letterSpacing="wider"
                        >
                          {t(`projects.addNode.roles.${role}`)}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="fg.muted" mt={0.5} lineClamp={2}>
                        {t(item.descKey)}
                      </Text>
                    </Box>
                  </HStack>
                </button>
              )
            })}
          </VStack>
        )}
      </Box>
    </Box>
  )
}
