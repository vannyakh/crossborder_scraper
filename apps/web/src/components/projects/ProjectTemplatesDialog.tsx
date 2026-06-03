import {
  Badge,
  Box,
  Button,
  Dialog,
  Grid,
  HStack,
  IconButton,
  Input,
  Portal,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ArrowRight, LayoutTemplate, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  useProjectTemplateUseMutation,
  useProjectTemplatesQuery,
} from '../../hooks/queries/use-project-templates-query'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { ApiProjectTemplateSummary } from '../../lib/api/project-map'
import { notifyError, notifySuccess } from '../../lib/toast'
import { PanelSelect } from '../ui/PanelSelect'
import { fieldStyles } from '../ui/field-styles'
import type { ProjectEnvironment } from './project-sample-data'

function NodeChip({ label, role }: { label: string; role?: string }) {
  const isConfig = role === 'config'
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      gap={1}
      px={2}
      py={0.5}
      borderRadius="full"
      fontSize="10px"
      fontWeight="medium"
      bg={isConfig ? 'bg.muted' : 'bg.elevated'}
      borderWidth="1px"
      borderColor="border.subtle"
      color="fg.subtle"
      whiteSpace="nowrap"
      maxW="80px"
    >
      <Box
        as="span"
        w="5px"
        h="5px"
        borderRadius="full"
        flexShrink={0}
        bg={isConfig ? 'fg.subtle' : 'colorPalette.solid'}
      />
      <Box as="span" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        {label}
      </Box>
    </Box>
  )
}

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
  const previewNodes = template.preview_nodes?.slice(0, 4) ?? []

  return (
    <Box
      as="button"
      textAlign="left"
      w="full"
      h="full"
      p={4}
      borderWidth="1.5px"
      borderColor={selected ? 'colorPalette.emphasized' : 'border.subtle'}
      borderRadius="var(--radius-panel)"
      bg={selected ? 'colorPalette.subtle' : 'bg.elevated'}
      colorPalette={accentPalette}
      transition="all var(--motion-duration)"
      _hover={{
        borderColor: selected ? 'colorPalette.emphasized' : 'border.default',
        bg: selected ? 'colorPalette.subtle' : 'bg.panelHover',
        transform: 'translateY(-1px)',
        shadow: 'sm',
      }}
      onClick={onSelect}
      cursor="pointer"
      display="flex"
      flexDirection="column"
      gap={3}
      role="option"
      aria-selected={selected}
    >
      {/* Header */}
      <HStack justify="space-between" align="start" gap={2}>
        <HStack gap={2} minW={0} flex={1}>
          <Box
            p={1.5}
            borderRadius="md"
            bg={selected ? 'colorPalette.muted' : 'bg.muted'}
            color={selected ? 'colorPalette.fg' : 'fg.muted'}
            flexShrink={0}
          >
            <LayoutTemplate size={14} />
          </Box>
          <Text fontWeight="semibold" fontSize="sm" lineClamp={2} textAlign="left">
            {template.name}
          </Text>
        </HStack>
        {template.featured && (
          <Badge size="sm" colorPalette={accentPalette} variant="subtle" flexShrink={0}>
            {t('projects.templates.featured')}
          </Badge>
        )}
      </HStack>

      {/* Description */}
      <Text fontSize="xs" color="fg.muted" lineClamp={2} textAlign="left" flex={1}>
        {template.summary}
      </Text>

      {/* Node preview chips */}
      {previewNodes.length > 0 && (
        <HStack gap={1} flexWrap="nowrap" overflow="hidden">
          {previewNodes.map((node, idx) => (
            <HStack key={node.id} gap={1} flexShrink={idx > 0 ? 1 : 0} minW={0}>
              {idx > 0 && (
                <Box color="fg.subtle" flexShrink={0}>
                  <ArrowRight size={9} />
                </Box>
              )}
              <NodeChip label={node.label} role={node.role} />
            </HStack>
          ))}
          {(template.preview_nodes?.length ?? 0) > 4 && (
            <Text fontSize="10px" color="fg.subtle" flexShrink={0}>
              +{template.preview_nodes!.length - 4}
            </Text>
          )}
        </HStack>
      )}

      {/* Footer */}
      <HStack gap={2} flexWrap="wrap" mt="auto">
        <Badge size="sm" variant="outline" colorPalette="gray">
          {template.category_label}
        </Badge>
        <Text fontSize="xs" color="fg.subtle">
          {t('projects.templates.nodeCount', { count: String(template.node_count) })}
        </Text>
        {template.author && (
          <Text fontSize="xs" color="fg.subtle" ml="auto">
            {template.author}
          </Text>
        )}
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
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [environment, setEnvironment] = useState<ProjectEnvironment>('development')

  const { data, isLoading, isError, refetch } = useProjectTemplatesQuery(category || undefined)
  const useTemplate = useProjectTemplateUseMutation()

  const templates = data?.items ?? []

  const filtered = useMemo(() => {
    if (!search.trim()) return templates
    const q = search.trim().toLowerCase()
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.category_label.toLowerCase().includes(q),
    )
  }, [templates, search])

  const selected = useMemo(
    () => templates.find((row) => row.id === selectedId) ?? null,
    [selectedId, templates],
  )

  const reset = () => {
    setSelectedId(null)
    setName('')
    setEnvironment('development')
    setCategory('')
    setSearch('')
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
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) close()
      }}
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner alignItems="stretch" justifyContent="stretch" p={0}>
          <Dialog.Content
            w="100vw"
            h="100dvh"
            maxW="100vw"
            maxH="100dvh"
            borderRadius={0}
            bg="bg.panel"
            borderWidth={0}
            display="flex"
            flexDirection="column"
          >
            {/* Header bar */}
            <Dialog.Header
              borderBottomWidth="1px"
              borderColor="border.subtle"
              flexShrink={0}
              py={3}
              px={5}
              pr={14}
              display="flex"
              alignItems="center"
              gap={3}
            >
              <Box p={1.5} borderRadius="md" bg="bg.muted" color="fg.muted" flexShrink={0}>
                <LayoutTemplate size={16} />
              </Box>
              <Box minW={0}>
                <Dialog.Title fontSize="md" fontWeight="semibold">
                  {t('projects.templates.title')}
                </Dialog.Title>
                <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                  {t('projects.templates.desc')}
                </Text>
              </Box>
              <Dialog.CloseTrigger asChild position="absolute" top={3} right={4}>
                <IconButton size="sm" variant="ghost" aria-label="Close">
                  <X size={16} />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            {/* Body — sidebar + grid */}
            <Box flex={1} minH={0} display="flex" overflow="hidden">
              {/* Left sidebar */}
              <Box
                w={{ base: '220px', md: '260px' }}
                flexShrink={0}
                borderRightWidth="1px"
                borderColor="border.subtle"
                display="flex"
                flexDirection="column"
                gap={0}
                overflow="auto"
                className="app-scroll"
              >
                <VStack align="stretch" gap={4} p={4}>
                  {/* Search */}
                  <Box>
                    <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={1.5}>
                      Search
                    </Text>
                    <Box position="relative">
                      <Box
                        position="absolute"
                        left={2.5}
                        top="50%"
                        transform="translateY(-50%)"
                        color="fg.subtle"
                        pointerEvents="none"
                      >
                        <Search size={13} />
                      </Box>
                      <Input
                        {...fieldStyles}
                        size="sm"
                        pl={7}
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value)
                          setSelectedId(null)
                        }}
                        placeholder="Filter templates…"
                      />
                    </Box>
                  </Box>

                  {/* Category */}
                  <Box>
                    <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={1.5}>
                      {t('projects.templates.categoryFilter')}
                    </Text>
                    <PanelSelect
                      size="sm"
                      value={category}
                      onChange={(value) => {
                        setCategory(value)
                        setSelectedId(null)
                        setSearch('')
                      }}
                      options={categoryOptions}
                    />
                  </Box>

                  {/* Stats */}
                  {!isLoading && !isError && (
                    <Text fontSize="xs" color="fg.subtle">
                      {filtered.length} template{filtered.length !== 1 ? 's' : ''}
                      {search || category ? ' matching' : ' available'}
                    </Text>
                  )}
                </VStack>

                {/* Selected template — project options */}
                {selected && (
                  <Box borderTopWidth="1px" borderColor="border.subtle" p={4} mt="auto">
                    <Text fontWeight="medium" fontSize="xs" mb={3} color="fg.default">
                      {t('projects.templates.optionsTitle')}
                    </Text>
                    <VStack align="stretch" gap={3}>
                      <Box>
                        <Text fontSize="xs" color="fg.muted" mb={1}>
                          {t('projects.nameLabel')}
                        </Text>
                        <Input
                          {...fieldStyles}
                          size="sm"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t('projects.namePlaceholder')}
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
                    </VStack>
                  </Box>
                )}
              </Box>

              {/* Main template grid */}
              <Box flex={1} minW={0} overflow="auto" className="app-scroll" p={5}>
                {isLoading ? (
                  <HStack justify="center" py={16}>
                    <Spinner size="sm" />
                  </HStack>
                ) : isError ? (
                  <VStack py={16} gap={2}>
                    <Text fontSize="sm" color="fg.muted">
                      {t('projects.templates.loadFailed')}
                    </Text>
                    <Button size="sm" variant="outline" onClick={() => void refetch()}>
                      {t('common.retry')}
                    </Button>
                  </VStack>
                ) : filtered.length === 0 ? (
                  <VStack py={16} gap={2}>
                    <Text fontSize="sm" color="fg.muted">
                      {t('projects.templates.empty')}
                    </Text>
                    {(search || category) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSearch('')
                          setCategory('')
                        }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </VStack>
                ) : (
                  <Grid
                    templateColumns={{
                      base: '1fr',
                      md: '1fr 1fr',
                      lg: 'repeat(3, 1fr)',
                      xl: 'repeat(4, 1fr)',
                    }}
                    gap={3}
                    alignItems="start"
                  >
                    {filtered.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        selected={selectedId === template.id}
                        onSelect={() => handleSelect(template)}
                      />
                    ))}
                  </Grid>
                )}
              </Box>
            </Box>

            {/* Footer */}
            <Dialog.Footer
              borderTopWidth="1px"
              borderColor="border.subtle"
              flexShrink={0}
              py={3}
              px={5}
            >
              <HStack justify="space-between" w="full" gap={2}>
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
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
