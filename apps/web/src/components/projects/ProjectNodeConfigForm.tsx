import { Box, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useLocale } from '../../hooks/use-locale'
import {
  configSectionsForTab,
  getNodeConfigSchema,
  resolveFieldValue,
  type NodeConfigSchema,
  type ProjectConfigSection,
  type ProjectConfigTabId,
} from './node-config/registry'
import { ProjectNodeConfigField } from './ProjectNodeConfigField'
import type { ProjectNode } from './project-sample-data'

function filterSection(
  node: ProjectNode,
  section: ProjectConfigSection,
  query: string,
  t: (key: string) => string,
) {
  if (!query) return section.fields
  const q = query.toLowerCase()
  return section.fields.filter((field) => {
    const label = (field.labelText ?? t(field.labelKey)).toLowerCase()
    const value = resolveFieldValue(node, field, t).toLowerCase()
    return label.includes(q) || value.includes(q)
  })
}

function SectionBlock({
  node,
  section,
  filter,
}: {
  node: ProjectNode
  section: ProjectConfigSection
  filter: string
}) {
  const { t } = useLocale()
  const fields = filterSection(node, section, filter, t)
  if (fields.length === 0) return null

  const singleField = fields.length === 1 && section.fields.length === 1

  return (
    <Box
      id={section.id}
      className="project-config-section"
      scrollMarginTop="4rem"
      data-single={singleField ? '' : undefined}
    >
      {!singleField ? (
        <Text className="project-config-section__title">
          {section.labelText ?? t(section.labelKey)}
        </Text>
      ) : null}
      <VStack className="project-config-section__fields" align="stretch" gap={3}>
        {fields.map((field) => (
          <ProjectNodeConfigField key={field.id} node={node} field={field} />
        ))}
      </VStack>
    </Box>
  )
}

export function ProjectNodeConfigForm({
  node,
  tab,
  filter,
  schema: schemaOverride,
}: {
  node: ProjectNode
  tab: ProjectConfigTabId
  filter: string
  schema?: NodeConfigSchema
}) {
  const { t } = useLocale()
  const schema = schemaOverride ?? getNodeConfigSchema(node)
  const sections = useMemo(() => configSectionsForTab(schema, tab), [schema, tab])

  const blocks = sections
    .map((section) => (
      <SectionBlock key={section.id} node={node} section={section} filter={filter} />
    ))
    .filter(Boolean)

  if (blocks.length === 0) {
    return (
      <Text fontSize="sm" color="fg.muted" py={4}>
        {t('projects.config.noMatches')}
      </Text>
    )
  }

  return (
    <VStack className="project-config-form" align="stretch" gap={5}>
      {blocks}
    </VStack>
  )
}
