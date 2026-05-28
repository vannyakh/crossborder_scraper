import { Box, Button, Grid, HStack, Text, VStack } from '@chakra-ui/react'
import { BookOpen } from 'lucide-react'
import { useMemo, useState } from 'react'
import { usePanelGuidesQuery } from '../../hooks/queries/use-panel-guides-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { PanelGuideSummary } from '../../lib/api'
import { ListCardRowsSkeleton } from '../ui/PanelSkeleton'
import { SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import { PanelGuideViews, usePanelGuideState } from './PanelGuideViews'

const CATEGORY_TONE = {
  agent: 'brand',
  scrape: 'neutral',
  panel: 'neutral',
  integrate: 'success',
} as const

function GuideCard({ guide, onOpen }: { guide: PanelGuideSummary; onOpen: () => void }) {
  const accentPalette = useAccentPalette()

  return (
    <Box
      p={3}
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-card)"
      bg="bg.elevated"
      h="full"
      display="flex"
      flexDirection="column"
    >
      <HStack justify="space-between" align="flex-start" gap={2} mb={2}>
        <HStack gap={2} minW={0}>
          <Box color="fg.muted" flexShrink={0}>
            <BookOpen size={16} />
          </Box>
          <Text fontSize="sm" fontWeight="semibold" lineClamp={2}>
            {guide.title}
          </Text>
        </HStack>
        <StatusBadge status={CATEGORY_TONE[guide.category]} label={guide.category_label} />
      </HStack>
      <Text fontSize="xs" color="fg.muted" flex={1} lineClamp={3}>
        {guide.summary}
      </Text>
      <Button
        mt={3}
        size="xs"
        variant="outline"
        borderColor="border.subtle"
        borderRadius="input"
        colorPalette={accentPalette}
        onClick={onOpen}
      >
        View guide
      </Button>
    </Box>
  )
}

export function PanelGuidesPanel() {
  const accentPalette = useAccentPalette()
  const [category, setCategory] = useState<string>('all')
  const guide = usePanelGuideState()
  const { data, isLoading, error } = usePanelGuidesQuery()

  const categories = useMemo(
    () => [{ id: 'all', label: 'All' }, ...(data?.categories ?? [])],
    [data?.categories],
  )

  const filtered = useMemo(() => {
    const items = data?.items ?? []
    if (category === 'all') return items
    return items.filter((g) => g.category === category)
  }, [category, data?.items])

  return (
    <>
      <SectionCard>
        <HStack gap={2} flexWrap="wrap" mb={4}>
          {categories.map((item) => (
            <Button
              key={item.id}
              size="xs"
              variant={category === item.id ? 'solid' : 'outline'}
              borderColor="border.subtle"
              borderRadius="input"
              colorPalette={category === item.id ? accentPalette : 'gray'}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </HStack>

        {error ? (
          <Text fontSize="sm" color="red.500" mb={3}>
            {String((error as Error).message || error)}
          </Text>
        ) : null}

        {isLoading ? (
          <ListCardRowsSkeleton rows={6} />
        ) : (
          <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }} gap={3}>
            {filtered.map((item) => (
              <GuideCard key={item.id} guide={item} onOpen={() => guide.openGuide(item.id)} />
            ))}
          </Grid>
        )}

        {!isLoading && filtered.length === 0 ? (
          <Text fontSize="sm" color="fg.muted" mt={2}>
            No guides in this category.
          </Text>
        ) : null}

        <VStack
          align="stretch"
          gap={1}
          mt={4}
          pt={3}
          borderTopWidth="1px"
          borderColor="border.subtle"
        >
          <Text fontSize="xs" color="fg.subtle">
            Guides load from{' '}
            <Text as="span" fontFamily="mono">
              libs/guides/*.md
            </Text>{' '}
            via{' '}
            <Text as="span" fontFamily="mono">
              GET /guides
            </Text>
            . Edit markdown on the server to update instructions without rebuilding the panel.
          </Text>
        </VStack>
      </SectionCard>

      <PanelGuideViews guideId={guide.guideId} open={guide.open} onClose={guide.closeGuide} />
    </>
  )
}
