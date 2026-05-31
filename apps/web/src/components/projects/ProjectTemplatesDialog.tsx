import { Badge, Box, Button, Grid, HStack, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import { LayoutTemplate } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  useProjectTemplateUseMutation,
  useProjectTemplatesQuery,
} from '../../hooks/queries/use-project-templates-query'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { ApiProjectTemplateSummary } from '../../lib/api/project-map'
import { notifyError, notifySuccess } from '../../lib/toast'
import { PanelDialog } from '../ui/PanelDialog'
import { PanelSelect } from '../ui/PanelSelect'
import { fieldStyles } from '../ui/field-styles'
import type { ProjectEnvironment } from './project-sample-data'

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: ApiProjectTemplateSummary
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()

  return (
    <Box
      as="button"
      textAlign="left"
      w="full"
      p={4}
      borderWidth="1px"
      borderColor={selected ? 'colorPalette.emphasized' : 'border.subtle'}
      borderRadius="var(--radius-panel)"
      bg={selected ? 'colorPalette.subtle' : 'bg.elevated'}
      colorPalette={accentPalette}
      transition="border-color var(--motion-duration), background var(--motion-duration)"
      _hover={{ borderColor: 'border.default', bg: 'bg.panelHover' }}
      onClick={onSelect}
      cursor="pointer"
    >
      <HStack justify="space-between" align="start" gap={2} mb={2}>
        <HStack gap={2} minW={0}>
          <Box color="colorPalette.fg" aria-hidden flexShrink={0}>
            <LayoutTemplate size={16} />
          </Box>
          <Text fontWeight="semibold" fontSize="sm" lineClamp={2}>
            {template.name}
          </Text>
        </HStack>
        {template.featured ? (
          <Badge size="sm" colorPalette={accentPalette} variant="subtle">
            {t('projects.templates.featured')}
          </Badge>
        ) : null}
      </HStack>
      <Text fontSize="xs" color="fg.muted" lineClamp={3} mb={2}>
        {template.summary}
      </Text>
      <HStack gap={2} flexWrap="wrap">
        <Badge size="sm" variant="outline" colorPalette="gray">
          {template.category_label}
        </Badge>
        <Text fontSize="xs" color="fg.muted">
          {t('projects.templates.nodeCount', { count: String(template.node_count) })}
        </Text>
      </HStack>
    </Box>
  )
}

export function ProjectTemplatesDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (projectId: string) => void
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const [category, setCategory] = useState<string>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [environment, setEnvironment] = useState<ProjectEnvironment>('development')

  const { data, isLoading, isError, refetch } = useProjectTemplatesQuery(category || undefined)
  const useTemplate = useProjectTemplateUseMutation()

  const templates = data?.items ?? []
  const selected = useMemo(
    () => templates.find((row) => row.id === selectedId) ?? null,
    [selectedId, templates],
  )

  const reset = () => {
    setSelectedId(null)
    setName('')
    setEnvironment('development')
    setCategory('')
  }

  const close = () => {
    reset()
    onClose()
  }

  const handleSelect = (template: ApiProjectTemplateSummary) => {
    setSelectedId(template.id)
    setName(template.name)
  }

  const handleUse = async () => {
    if (!selectedId) return
    try {
      const res = await useTemplate.mutateAsync({
        templateId: selectedId,
        name: name.trim() || undefined,
        environment,
      })
      notifySuccess(t('projects.templates.created', { name: res.project.name }))
      close()
      onCreated(res.project.id)
    } catch {
      notifyError(t('projects.templates.createFailed'))
    }
  }

  const categoryOptions = [
    { value: '', label: t('projects.templates.allCategories') },
    ...(data?.categories ?? []).map((row) => ({
      value: row.id,
      label: `${row.label} (${row.count})`,
    })),
  ]

  return (
    <PanelDialog
      open={open}
      onClose={close}
      title={t('projects.templates.title')}
      maxW="3xl"
      footer={
        <HStack justify="space-between" w="full" flexWrap="wrap" gap={2}>
          <Text fontSize="xs" color="fg.muted">
            {selected
              ? t('projects.templates.selected', { name: selected.name })
              : t('projects.templates.pickOne')}
          </Text>
          <HStack gap={2}>
            <Button size="sm" variant="ghost" onClick={close}>
              {t('db.create.cancel')}
            </Button>
            <Button
              size="sm"
              colorPalette={accentPalette}
              disabled={!selectedId || !name.trim()}
              loading={useTemplate.isPending}
              onClick={() => void handleUse()}
            >
              {t('projects.templates.use')}
            </Button>
          </HStack>
        </HStack>
      }
    >
      <VStack align="stretch" gap={4}>
        <Text fontSize="xs" color="fg.muted">
          {t('projects.templates.desc')}
        </Text>

        <Box maxW="xs">
          <Text fontSize="xs" color="fg.muted" mb={1}>
            {t('projects.templates.categoryFilter')}
          </Text>
          <PanelSelect
            size="sm"
            value={category}
            onChange={(value) => {
              setCategory(value)
              setSelectedId(null)
            }}
            options={categoryOptions}
          />
        </Box>

        {isLoading ? (
          <HStack justify="center" py={10}>
            <Spinner size="sm" />
          </HStack>
        ) : isError ? (
          <VStack py={8} gap={2}>
            <Text fontSize="sm" color="fg.muted">
              {t('projects.templates.loadFailed')}
            </Text>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              {t('common.retry')}
            </Button>
          </VStack>
        ) : templates.length === 0 ? (
          <Text fontSize="sm" color="fg.muted" py={6}>
            {t('projects.templates.empty')}
          </Text>
        ) : (
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3}>
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedId === template.id}
                onSelect={() => handleSelect(template)}
              />
            ))}
          </Grid>
        )}

        {selected ? (
          <Box pt={2} borderTopWidth="1px" borderColor="border.subtle">
            <Text fontWeight="medium" fontSize="sm" mb={3}>
              {t('projects.templates.optionsTitle')}
            </Text>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3}>
              <Box>
                <Text fontSize="xs" color="fg.muted" mb={1}>
                  {t('projects.nameLabel')}
                </Text>
                <Input
                  {...fieldStyles}
                  size="sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Box>
              <Box>
                <Text fontSize="xs" color="fg.muted" mb={1}>
                  {t('projects.environmentLabel')}
                </Text>
                <PanelSelect
                  size="sm"
                  value={environment}
                  onChange={(v) => setEnvironment(v as ProjectEnvironment)}
                  options={[
                    { value: 'production', label: t('projects.envProduction') },
                    { value: 'staging', label: t('projects.envStaging') },
                    { value: 'development', label: t('projects.envDevelopment') },
                  ]}
                />
              </Box>
            </Grid>
          </Box>
        ) : null}
      </VStack>
    </PanelDialog>
  )
}
