import { Box, Text } from '@chakra-ui/react'
import { Bot, Database, GitBranch, Globe, Layers, Server } from 'lucide-react'
import type { ProjectNodeKind } from './project-sample-data'

const NODE_META: Record<
  ProjectNodeKind,
  { icon: typeof Server; bg: string; color: string; abbr: string }
> = {
  github: { icon: GitBranch, bg: 'gray.900', color: 'white', abbr: 'GH' },
  redis: { icon: Server, bg: 'red.600', color: 'white', abbr: 'R' },
  postgres: { icon: Database, bg: 'blue.600', color: 'white', abbr: 'PG' },
  scrape: { icon: Layers, bg: 'green.600', color: 'white', abbr: 'SC' },
  agent: { icon: Bot, bg: 'purple.600', color: 'white', abbr: 'AI' },
  webhook: { icon: Globe, bg: 'orange.600', color: 'white', abbr: 'WH' },
}

export function ProjectNodeVisual({
  kind,
  label,
  size = 'md',
  selected,
}: {
  kind: ProjectNodeKind
  label: string
  size?: 'sm' | 'md'
  selected?: boolean
}) {
  const meta = NODE_META[kind]
  const Icon = meta.icon
  const dim = size === 'sm' ? 28 : 44
  const fontSize = size === 'sm' ? '9px' : '10px'

  return (
    <Box textAlign="center" w={size === 'sm' ? '52px' : '72px'}>
      <Box
        mx="auto"
        w={`${dim}px`}
        h={`${dim}px`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        borderRadius="md"
        bg={meta.bg}
        color={meta.color}
        borderWidth="2px"
        borderColor={selected ? 'accent.solid' : 'transparent'}
        boxShadow={selected ? '0 0 0 2px var(--chakra-colors-accent-muted)' : 'sm'}
      >
        <Icon size={size === 'sm' ? 14 : 20} strokeWidth={1.75} />
      </Box>
      <Text
        mt={1}
        fontSize={fontSize}
        fontWeight="medium"
        color="fg.muted"
        lineClamp={1}
        fontFamily="mono"
      >
        {label}
      </Text>
    </Box>
  )
}

export function nodeCenter(
  node: { x: number; y: number },
  size: 'sm' | 'md',
): { cx: number; cy: number } {
  const half = size === 'sm' ? 26 : 36
  return { cx: node.x + half, cy: node.y + (size === 'sm' ? 14 : 22) }
}
