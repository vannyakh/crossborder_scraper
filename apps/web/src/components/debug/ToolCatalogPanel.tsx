import {
  Box,
  Button,
  ButtonGroup,
  Code,
  Collapsible,
  Grid,
  HStack,
  IconButton,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ChevronDown, Copy, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Toolbar } from '../layout/Toolbar'
import { PanelGuideViews, usePanelGuideState } from '../guides/PanelGuideViews'
import { DataListEmpty } from '../ui/DataList'
import { ListCardRowsSkeleton, FormFieldsSkeleton } from '../ui/PanelSkeleton'
import { SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import { useGatewayToolsQuery } from '../../hooks'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { GatewayTool } from '../../lib/api'
import {
  filterToolsByCategory,
  inferToolCategory,
  searchTools,
  summarizeToolSchema,
  TOOL_CATEGORY_FILTERS,
  type ToolCategory,
} from './tool-catalog-utils'

function ToolListItem({
  tool,
  selected,
  onSelect,
}: {
  tool: GatewayTool
  selected: boolean
  onSelect: () => void
}) {
  const summary = summarizeToolSchema(tool.parameters)

  return (
    <button
      type="button"
      style={{
        textAlign: 'left',
        padding: '0.75rem',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: selected
          ? 'color-mix(in srgb, var(--app-accent) 40%, transparent)'
          : 'var(--chakra-colors-border-subtle)',
        borderRadius: 'var(--radius-card)',
        background: selected ? 'var(--nav-active-bg)' : 'var(--chakra-colors-bg-panel)',
        cursor: 'pointer',
        width: '100%',
      }}
      onClick={onSelect}
    >
      <HStack justify="space-between" align="flex-start" gap={2}>
        <Text fontSize="sm" fontWeight="semibold" fontFamily="mono" lineClamp={1}>
          {tool.name}
        </Text>
        <StatusBadge status="neutral" label={inferToolCategory(tool.name)} />
      </HStack>
      <Text mt={1} fontSize="xs" color="fg.muted" lineClamp={2}>
        {tool.description}
      </Text>
      <HStack mt={2} gap={1} flexWrap="wrap">
        {summary.required.length ? (
          <StatusBadge status="brand" label={`${summary.required.length} required`} />
        ) : (
          <StatusBadge status="neutral" label="No required params" />
        )}
        {summary.propertyCount ? (
          <StatusBadge status="neutral" label={`${summary.propertyCount} fields`} />
        ) : null}
      </HStack>
    </button>
  )
}

function ToolDetailPanel({ tool }: { tool: GatewayTool }) {
  const accentPalette = useAccentPalette()
  const [schemaOpen, setSchemaOpen] = useState(true)
  const summary = summarizeToolSchema(tool.parameters)
  const schemaText = JSON.stringify(tool.parameters, null, 2)

  async function copySchema() {
    try {
      await navigator.clipboard.writeText(schemaText)
    } catch {
      /* ignore */
    }
  }

  return (
    <SectionCard>
      <VStack align="stretch" gap={3}>
        <HStack justify="space-between" align="flex-start" gap={2} flexWrap="wrap">
          <Box minW={0}>
            <Text fontSize="lg" fontWeight="semibold" fontFamily="mono">
              {tool.name}
            </Text>
            <Text mt={1} fontSize="sm" color="fg.muted">
              {tool.description}
            </Text>
          </Box>
          <StatusBadge status="neutral" label={inferToolCategory(tool.name)} />
        </HStack>

        {summary.required.length ? (
          <Box>
            <Text fontSize="xs" color="fg.subtle" mb={1.5}>
              Required parameters
            </Text>
            <HStack gap={1.5} flexWrap="wrap">
              {summary.required.map((name) => (
                <StatusBadge key={name} status="brand" label={name} />
              ))}
            </HStack>
          </Box>
        ) : (
          <Text fontSize="sm" color="fg.muted">
            No required parameters — the agent may call this tool with an empty object.
          </Text>
        )}

        <Collapsible.Root open={schemaOpen} onOpenChange={(e) => setSchemaOpen(e.open)}>
          <HStack justify="space-between" mb={2}>
            <Collapsible.Trigger asChild>
              <Button size="xs" variant="ghost" colorPalette={accentPalette}>
                <ChevronDown
                  size={14}
                  style={{
                    transform: schemaOpen ? 'rotate(180deg)' : undefined,
                    transition: 'transform 0.15s ease',
                  }}
                />
                JSON schema
              </Button>
            </Collapsible.Trigger>
            <IconButton
              size="xs"
              variant="outline"
              borderColor="border.subtle"
              aria-label="Copy schema"
              onClick={() => void copySchema()}
            >
              <Copy size={14} />
            </IconButton>
          </HStack>
          <Collapsible.Content>
            <Code
              display="block"
              whiteSpace="pre-wrap"
              p={3}
              borderRadius="sm"
              fontSize="xs"
              maxH="min(420px, 50vh)"
              overflowY="auto"
            >
              {schemaText}
            </Code>
          </Collapsible.Content>
        </Collapsible.Root>
      </VStack>
    </SectionCard>
  )
}

export function ToolCatalogPanel() {
  const accentPalette = useAccentPalette()
  const { data, isLoading, error, refetch, isFetching } = useGatewayToolsQuery()
  const tools = data?.items ?? []
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ToolCategory>('all')
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const guide = usePanelGuideState()

  const filtered = useMemo(() => {
    const byCategory = filterToolsByCategory(tools, category)
    return searchTools(byCategory, search)
  }, [tools, category, search])

  const selected =
    filtered.find((tool) => tool.name === selectedName) ??
    filtered.find((tool) => tool.name === (selectedName ?? tools[0]?.name)) ??
    filtered[0]

  return (
    <>
      <Toolbar
        title="Tool catalog"
        description="Tools the gateway agent can call during chat and cron runs"
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              borderRadius="input"
              colorPalette={accentPalette}
              onClick={() => guide.openGuide('agent-tools')}
            >
              Setup guide
            </Button>
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              borderRadius="input"
              loading={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
          </>
        }
      />

      <SectionCard p={0} overflow="hidden">
        <Box px={{ base: 3, md: 4 }} py={{ base: 3, md: 4 }}>
          <HStack gap={3} flexWrap="wrap" align="center" justify="space-between" w="full">
            <ButtonGroup size="xs" variant="outline" attached flexWrap="wrap" flexShrink={0}>
              {TOOL_CATEGORY_FILTERS.map((filter) => (
                <Button
                  key={filter.id}
                  borderColor="border.subtle"
                  borderRadius="input"
                  colorPalette={category === filter.id ? accentPalette : 'gray'}
                  variant={category === filter.id ? 'solid' : 'outline'}
                  onClick={() => {
                    setCategory(filter.id)
                    setSelectedName(null)
                  }}
                >
                  {filter.label}
                </Button>
              ))}
            </ButtonGroup>

            <HStack
              gap={2}
              flex="1"
              justify="flex-end"
              minW={{ base: 'full', md: '280px' }}
              maxW="lg"
            >
              <HStack
                flex="1"
                minW={{ base: 'full', sm: '200px' }}
                maxW="md"
                borderWidth="1px"
                borderColor="border.subtle"
                borderRadius="var(--radius-input)"
                px={2}
                bg="bg.input"
              >
                <Search size={14} strokeWidth={2} color="var(--chakra-colors-fg-muted)" />
                <Input
                  size="sm"
                  variant="flushed"
                  border="none"
                  flex={1}
                  placeholder="Search tools by name or description…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </HStack>
              <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap" flexShrink={0}>
                {filtered.length} tool{filtered.length === 1 ? '' : 's'}
              </Text>
            </HStack>
          </HStack>
        </Box>

        {error ? (
          <Box px={{ base: 3, md: 4 }} pb={3}>
            <Text fontSize="sm" color="red.500">
              {String((error as Error).message || error)}
            </Text>
          </Box>
        ) : null}

        {isLoading ? (
          <Box px={{ base: 3, md: 4 }} pb={4}>
            <Grid templateColumns={{ base: '1fr', lg: 'minmax(260px, 320px) 1fr' }} gap={4}>
              <ListCardRowsSkeleton rows={5} />
              <FormFieldsSkeleton fields={4} />
            </Grid>
          </Box>
        ) : filtered.length === 0 ? (
          <DataListEmpty>No tools match your filters.</DataListEmpty>
        ) : (
          <Box px={{ base: 3, md: 4 }} pb={{ base: 3, md: 4 }}>
            <Grid templateColumns={{ base: '1fr', lg: 'minmax(260px, 320px) 1fr' }} gap={4}>
              <VStack align="stretch" gap={2} maxH="min(62vh, 640px)" overflowY="auto" pr={1}>
                {filtered.map((tool) => (
                  <ToolListItem
                    key={tool.name}
                    tool={tool}
                    selected={selected?.name === tool.name}
                    onSelect={() => setSelectedName(tool.name)}
                  />
                ))}
              </VStack>
              {selected ? <ToolDetailPanel tool={selected} /> : null}
            </Grid>
          </Box>
        )}
      </SectionCard>

      <PanelGuideViews guideId={guide.guideId} open={guide.open} onClose={guide.closeGuide} />
    </>
  )
}
