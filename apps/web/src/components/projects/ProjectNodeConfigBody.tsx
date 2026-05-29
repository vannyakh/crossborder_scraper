import { Box, Button, HStack, IconButton, Separator, Text, VStack } from '@chakra-ui/react'
import { ExternalLink } from 'lucide-react'
import { useLocale } from '../../hooks/use-locale'
import {
  configSectionsForTab,
  getNodeConfigSchema,
  publicUrlForNode,
  resolveFieldValue,
  type ProjectConfigField,
  type ProjectConfigSection,
  type ProjectConfigTabId,
} from './project-node-config-sections'
import type { ProjectNode } from './project-sample-data'

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack justify="space-between" gap={4} py={2} fontSize="sm">
      <Text color="fg.muted" flexShrink={0}>
        {label}
      </Text>
      <Text fontFamily="mono" fontSize="xs" textAlign="right" lineClamp={2}>
        {value}
      </Text>
    </HStack>
  )
}

function SectionFields({
  node,
  section,
  filter,
}: {
  node: ProjectNode
  section: ProjectConfigSection
  filter: string
}) {
  const { t } = useLocale()
  const q = filter.trim().toLowerCase()

  const fields = section.fields.filter((field) => {
    if (!q) return true
    const label = t(field.labelKey).toLowerCase()
    const value = resolveFieldValue(node, field, t).toLowerCase()
    return label.includes(q) || value.includes(q)
  })

  if (fields.length === 0) return null

  return (
    <Box
      id={section.id}
      scrollMarginTop="4rem"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-card)"
      bg="bg.panel"
      overflow="hidden"
    >
      <Box px={4} py={3} borderBottomWidth="1px" borderColor="border.subtle">
        <Text fontWeight="semibold" fontSize="sm">
          {t(section.labelKey)}
        </Text>
      </Box>
      <Box px={4} py={3}>
        {fields.map((field) => (
          <FieldBlock key={field.id} node={node} field={field} />
        ))}
      </Box>
    </Box>
  )
}

function FieldBlock({ node, field }: { node: ProjectNode; field: ProjectConfigField }) {
  const { t } = useLocale()
  const label = t(field.labelKey)
  const value = resolveFieldValue(node, field, t)

  if (field.type === 'hint') {
    return (
      <Text fontSize="xs" color="fg.muted" lineHeight="tall" py={2}>
        {value === '—' ? t('projects.config.previewHint') : value}
      </Text>
    )
  }

  if (field.type === 'image') {
    return (
      <Box py={2}>
        <Text fontSize="sm" color="fg.muted" mb={2}>
          {label}
        </Text>
        <HStack justify="space-between" gap={2}>
          <Text fontFamily="mono" fontSize="sm">
            {value}
          </Text>
          <Button size="xs" variant="outline" disabled>
            {t('projects.config.upgrade')}
          </Button>
        </HStack>
        <Separator my={3} />
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          {t('projects.config.registry')}
        </Text>
        <Text fontSize="xs" color="fg.muted">
          {t('projects.config.registryHint')}
        </Text>
      </Box>
    )
  }

  if (field.type === 'url') {
    const url = publicUrlForNode(node)
    return (
      <Box py={2}>
        <Text fontSize="sm" color="fg.muted" mb={2}>
          {label}
        </Text>
        <HStack
          p={3}
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="var(--radius-input)"
          bg="bg.elevated"
          justify="space-between"
          gap={2}
        >
          <Text fontFamily="mono" fontSize="xs" lineClamp={2} flex={1}>
            {url}
          </Text>
          <IconButton size="xs" variant="ghost" aria-label={t('projects.config.openUrl')}>
            <ExternalLink size={14} />
          </IconButton>
        </HStack>
      </Box>
    )
  }

  return <FieldRow label={label} value={value} />
}

export function ProjectNodeConfigBody({
  node,
  tab,
  filter,
}: {
  node: ProjectNode
  tab: ProjectConfigTabId
  filter: string
}) {
  const { t } = useLocale()
  const schema = getNodeConfigSchema(node)
  const sections = configSectionsForTab(schema, tab)

  const blocks = sections
    .map((section) => (
      <SectionFields key={section.id} node={node} section={section} filter={filter} />
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
    <VStack align="stretch" gap={4}>
      {blocks}
    </VStack>
  )
}
