import { Box, Button, HStack, IconButton, Input, Text, VStack } from '@chakra-ui/react'
import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { NODE_VISUAL } from './project-node-meta'
import { ProjectNodeConfigBody } from './ProjectNodeConfigBody'
import {
  configSectionsForTab,
  getNodeConfigSchema,
  type ProjectConfigSectionId,
  type ProjectConfigTabId,
} from './project-node-config-sections'
import type { ProjectNode } from './project-sample-data'

export function ProjectNodeConfigPanel({
  node,
  onClose,
}: {
  node: ProjectNode
  onClose: () => void
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const meta = NODE_VISUAL[node.kind]
  const Icon = meta.icon
  const schema = useMemo(() => getNodeConfigSchema(node), [node])
  const [tab, setTab] = useState<ProjectConfigTabId>(schema.defaultTab)
  const [filter, setFilter] = useState('')
  const [section, setSection] = useState<ProjectConfigSectionId>('source')

  const tabSections = useMemo(() => configSectionsForTab(schema, tab), [schema, tab])
  const showAnchors = tabSections.length > 1

  useEffect(() => {
    setTab(schema.defaultTab)
    setFilter('')
    const first = schema.sections.find((s) => s.tab === schema.defaultTab)
    setSection(first?.id ?? 'overview')
  }, [node.id, schema])

  useEffect(() => {
    if (tabSections.length > 0 && !tabSections.some((s) => s.id === section)) {
      setSection(tabSections[0].id)
    }
  }, [tab, tabSections, section])

  return (
    <Box className="project-node-config-panel" role="dialog" aria-label={node.label}>
      <Box className="project-node-config-panel__header">
        <HStack gap={3} minW={0} flex={1}>
          <Box
            className="project-node-config-panel__icon"
            style={{ background: meta.iconBg, color: meta.iconColor }}
          >
            <Icon size={22} strokeWidth={1.75} />
          </Box>
          <Box minW={0}>
            <Text fontWeight="semibold" fontSize="lg" lineClamp={1}>
              {node.label}
            </Text>
            {node.subtitle ? (
              <Text fontSize="sm" color="fg.muted" lineClamp={1}>
                {node.subtitle}
              </Text>
            ) : null}
          </Box>
        </HStack>
        <IconButton aria-label="Close" size="sm" variant="ghost" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </Box>

      <HStack
        className="project-node-config-panel__tabs"
        gap={1}
        px={3}
        py={2}
        borderBottomWidth="1px"
        borderColor="border.subtle"
        overflowX="auto"
      >
        {schema.tabs.map((item) => (
          <Button
            key={item.id}
            size="xs"
            variant={tab === item.id ? 'subtle' : 'ghost'}
            colorPalette={tab === item.id ? accentPalette : undefined}
            flexShrink={0}
            onClick={() => setTab(item.id)}
          >
            {t(item.labelKey)}
          </Button>
        ))}
      </HStack>

      <Box px={3} py={2} borderBottomWidth="1px" borderColor="border.subtle">
        <Input
          size="sm"
          placeholder={t('projects.config.filterPlaceholder')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </Box>

      <HStack align="stretch" flex={1} minH={0} overflow="hidden">
        <Box className="project-node-config-panel__body app-scroll" flex={1} minW={0} p={4}>
          <ProjectNodeConfigBody node={node} tab={tab} filter={filter} />
        </Box>

        {showAnchors ? (
          <Box
            className="project-node-config-panel__anchors"
            borderLeftWidth="1px"
            borderColor="border.subtle"
            px={2}
            py={3}
            w="7.5rem"
            flexShrink={0}
          >
            <VStack align="stretch" gap={1}>
              {tabSections.map((item) => (
                <Button
                  key={item.id}
                  size="xs"
                  variant={section === item.id ? 'subtle' : 'ghost'}
                  justifyContent="flex-start"
                  onClick={() => {
                    setSection(item.id)
                    document
                      .getElementById(item.id)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  {t(item.labelKey)}
                </Button>
              ))}
            </VStack>
          </Box>
        ) : null}
      </HStack>
    </Box>
  )
}
