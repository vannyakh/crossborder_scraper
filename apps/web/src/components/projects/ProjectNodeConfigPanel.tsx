import { Box, Button, HStack, IconButton, Input, Text, VStack } from '@chakra-ui/react'
import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { ProjectAgentSlotChips } from './ProjectAgentSlotChips'
import { countSchemaFields, getNodeConfigSchema } from './node-config/registry'
import type { ProjectConfigSectionId, ProjectConfigTabId } from './node-config/types'
import { NODE_VISUAL } from './project-node-meta'
import { ProjectNodeConfigForm } from './ProjectNodeConfigForm'
import { ProjectNodeConfigOutput } from './ProjectNodeConfigOutput'
import type { ProjectNode } from './project-sample-data'

const OUTPUT_TAB = { id: 'output' as const, labelKey: 'projects.config.tabs.output' }

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
  const tabs = useMemo(() => {
    if (schema.tabs.some((item) => item.id === 'output')) return schema.tabs
    return [...schema.tabs, OUTPUT_TAB]
  }, [schema.tabs])
  const [tab, setTab] = useState<ProjectConfigTabId>(schema.defaultTab)
  const showAgentSlots = schema.parametersLayout === 'agent-slots' && tab !== 'output'
  const [filter, setFilter] = useState('')
  const [section, setSection] = useState<ProjectConfigSectionId>('source')

  const tabSections = useMemo(
    () => (tab === 'output' ? [] : schema.sections.filter((s) => s.tab === tab)),
    [schema, tab],
  )
  const fieldCount = useMemo(() => countSchemaFields(schema), [schema])
  const showFilter = tab !== 'output' && fieldCount > 4
  const showAnchors = tab !== 'output' && tabSections.length > 2

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTab(schema.defaultTab)
      setFilter('')
      const first = schema.sections.find((s) => s.tab === schema.defaultTab)
      setSection(first?.id ?? 'overview')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [node.id, schema])

  useEffect(() => {
    if (tabSections.length > 0 && !tabSections.some((s) => s.id === section)) {
      const frame = window.requestAnimationFrame(() => setSection(tabSections[0].id))
      return () => window.cancelAnimationFrame(frame)
    }
    return undefined
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

      <HStack className="project-node-config-panel__tabs" gap={0} px={2} py={0}>
        {tabs.map((item) => (
          <Button
            key={item.id}
            className={`project-node-config-panel__tab${tab === item.id ? ' is-active' : ''}`}
            size="sm"
            variant="ghost"
            colorPalette={tab === item.id ? accentPalette : undefined}
            flexShrink={0}
            borderRadius={0}
            onClick={() => setTab(item.id)}
          >
            {t(item.labelKey)}
          </Button>
        ))}
      </HStack>

      {showFilter ? (
        <Box className="project-node-config-panel__filter" px={3} py={2}>
          <Input
            size="sm"
            variant="outline"
            placeholder={t('projects.config.filterPlaceholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </Box>
      ) : null}

      <HStack align="stretch" flex={1} minH={0} overflow="hidden">
        <Box className="project-node-config-panel__body app-scroll" flex={1} minW={0} p={4}>
          {tab === 'output' ? (
            <ProjectNodeConfigOutput node={node} />
          ) : (
            <ProjectNodeConfigForm node={node} tab={tab} filter={filter} schema={schema} />
          )}
        </Box>

        {showAnchors ? (
          <Box className="project-node-config-panel__anchors">
            <VStack align="stretch" gap={0.5}>
              {tabSections.map((item) => (
                <Button
                  key={item.id}
                  className={`project-node-config-panel__anchor${
                    section === item.id ? ' is-active' : ''
                  }`}
                  size="xs"
                  variant="ghost"
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

      {showAgentSlots ? <ProjectAgentSlotChips agent={node} /> : null}
    </Box>
  )
}
