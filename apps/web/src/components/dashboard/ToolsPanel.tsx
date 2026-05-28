import { Box, Button, Grid, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { SoftwareToolCard, SoftwareToolSection } from '../../config/software-tools'
import { useToolGuideMap } from '../../hooks/use-tool-guide-map'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { PanelGuideViews } from '../guides/PanelGuideViews'
import { Section, SectionDivider } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import { ToolsPanelSkeleton } from './DashboardSkeleton'

function ToolCardTile({
  tool,
  guideId,
  onOpenGuide,
}: {
  tool: SoftwareToolCard
  guideId?: string
  onOpenGuide: (id: string) => void
}) {
  const accentPalette = useAccentPalette()
  const Icon = tool.icon
  const hasGuide = Boolean(guideId)

  return (
    <Box
      p={3}
      borderRadius="var(--radius-card)"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.elevated"
      h="full"
    >
      <HStackIcon icon={Icon} title={tool.title} accentPalette={accentPalette} />
      <Text mt={2} fontSize="xs" color="fg.muted" lineClamp={2} title={tool.description}>
        {tool.description}
      </Text>
      <Box mt={2}>
        <StatusBadge status={tool.statusTone} label={tool.status} />
      </Box>
      <Grid templateColumns={hasGuide ? '1fr 1fr' : '1fr'} gap={2} mt={3}>
        <Button
          asChild
          size="xs"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="input"
        >
          <Link to={tool.to}>Open</Link>
        </Button>
        {hasGuide ? (
          <Button
            size="xs"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            colorPalette={accentPalette}
            onClick={() => guideId && onOpenGuide(guideId)}
          >
            Guide
          </Button>
        ) : null}
      </Grid>
      {tool.primaryAction ? (
        <Button
          asChild
          size="xs"
          w="full"
          mt={2}
          colorPalette={accentPalette}
          borderRadius="var(--radius-input)"
        >
          <Link to={tool.primaryAction.to}>{tool.primaryAction.label}</Link>
        </Button>
      ) : !hasGuide ? (
        <Button
          asChild
          size="xs"
          w="full"
          mt={2}
          colorPalette={accentPalette}
          borderRadius="var(--radius-input)"
        >
          <Link to={tool.to}>Manage</Link>
        </Button>
      ) : null}
    </Box>
  )
}

export function ToolsPanel({
  sections,
  loading,
}: {
  sections: SoftwareToolSection[]
  loading?: boolean
}) {
  const toolGuideMap = useToolGuideMap()
  const [guideId, setGuideId] = useState<string | null>(null)

  if (loading) return <ToolsPanelSkeleton />

  return (
    <>
      <Section
        title="Software tools"
        description="Scrape panel, server tools, and gateway automation — Guide opens markdown instructions"
        mt={0}
      >
        <VStack align="stretch" gap={6}>
          {sections.map((section, index) => (
            <Box key={section.id}>
              {index > 0 ? (
                <Box mb={3}>
                  <SectionDivider title={section.title} />
                </Box>
              ) : (
                <Text fontSize="sm" fontWeight="semibold" color="fg" mb={0.5}>
                  {section.title}
                </Text>
              )}
              <Text
                fontSize="xs"
                color="fg.muted"
                mb={3}
                lineClamp={1}
                truncate
                title={section.description}
              >
                {section.description}
              </Text>
              <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }} gap={3}>
                {section.tools.map((tool) => (
                  <ToolCardTile
                    key={tool.id}
                    tool={tool}
                    guideId={toolGuideMap[tool.id]}
                    onOpenGuide={setGuideId}
                  />
                ))}
              </Grid>
            </Box>
          ))}
        </VStack>
      </Section>

      <PanelGuideViews guideId={guideId} open={Boolean(guideId)} onClose={() => setGuideId(null)} />
    </>
  )
}

function HStackIcon({
  icon: Icon,
  title,
  accentPalette,
}: {
  icon: typeof import('lucide-react').Bot
  title: string
  accentPalette: string
}) {
  return (
    <Box display="flex" alignItems="center" gap={2}>
      <Box
        p={1.5}
        borderRadius="var(--radius-card)"
        colorPalette={accentPalette}
        bg="colorPalette.subtle"
        color="colorPalette.fg"
      >
        <Icon size={18} strokeWidth={2} />
      </Box>
      <Text fontSize="sm" fontWeight="semibold" lineClamp={1}>
        {title}
      </Text>
    </Box>
  )
}
