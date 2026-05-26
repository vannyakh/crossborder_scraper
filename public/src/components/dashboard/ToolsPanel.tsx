import { Box, Button, Grid, Text } from '@chakra-ui/react'
import { Bot, FolderOpen, Package, Play, Settings, Workflow } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { Section } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'

type ToolCard = {
  id: string
  title: string
  description: string
  to: string
  status: string
  statusTone: 'success' | 'running' | 'neutral' | 'danger'
  icon: typeof Bot
  primaryAction?: { label: string; to: string }
}

export function ToolsPanel({ tools }: { tools: ToolCard[] }) {
  const accentPalette = useAccentPalette()
  return (
    <Section title="Software" description="Manage modules and open tools">
      <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3}>
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Box
              key={tool.id}
              p={3}
              borderRadius="var(--radius-card)"
              borderWidth="1px"
              borderColor="border.subtle"
              bg="bg.elevated"
            >
              <HStackIcon icon={Icon} title={tool.title} accentPalette={accentPalette} />
              <Text mt={2} fontSize="xs" color="fg.muted" minH="2.5em">
                {tool.description}
              </Text>
              <Box mt={2}>
                <StatusBadge status={tool.statusTone} label={tool.status} />
              </Box>
              <Grid templateColumns="1fr 1fr" gap={2} mt={3}>
                <Button
                  asChild
                  size="xs"
                  variant="outline"
                  borderColor="border.subtle"
                  borderRadius="input"
                >
                  <Link to={tool.to}>Open</Link>
                </Button>
                {tool.primaryAction ? (
                  <Button
                    asChild
                    size="xs"
                    colorPalette={accentPalette}
                    borderRadius="var(--radius-input)"
                  >
                    <Link to={tool.primaryAction.to}>{tool.primaryAction.label}</Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="xs"
                    colorPalette={accentPalette}
                    borderRadius="var(--radius-input)"
                  >
                    <Link to={tool.to}>Manage</Link>
                  </Button>
                )}
              </Grid>
            </Box>
          )
        })}
      </Grid>
    </Section>
  )
}

function HStackIcon({
  icon: Icon,
  title,
  accentPalette,
}: {
  icon: typeof Bot
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
      <Text fontSize="sm" fontWeight="semibold">
        {title}
      </Text>
    </Box>
  )
}

export const dashboardToolIcons = {
  batches: Play,
  products: Package,
  files: FolderOpen,
  agent: Bot,
  settings: Settings,
  workflows: Workflow,
}
