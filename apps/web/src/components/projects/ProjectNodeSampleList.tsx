import { Box, HStack, Text } from '@chakra-ui/react'
import { ProjectNodeVisual } from './ProjectNodeVisual'
import type { ProjectNode } from './project-sample-data'

export function ProjectNodeSampleList({
  nodes,
  size = 'sm',
  maxVisible = 5,
  compact = false,
}: {
  nodes: ProjectNode[]
  size?: 'sm' | 'md'
  maxVisible?: number
  /** Tighter layout for list rows */
  compact?: boolean
}) {
  const visible = nodes.slice(0, maxVisible)
  const extra = nodes.length - visible.length

  if (!visible.length) {
    return (
      <Text fontSize="xs" color="fg.subtle">
        —
      </Text>
    )
  }

  return (
    <HStack
      gap={compact ? 1.5 : 2}
      flexWrap="wrap"
      align="flex-start"
      justify={compact ? 'flex-start' : 'center'}
    >
      {visible.map((node) => (
        <ProjectNodeVisual key={node.id} kind={node.kind} label={node.label} size={size} />
      ))}
      {extra > 0 ? (
        <Box pt={size === 'sm' ? 1 : 2}>
          <Text fontSize="xs" color="fg.subtle" whiteSpace="nowrap">
            +{extra}
          </Text>
        </Box>
      ) : null}
    </HStack>
  )
}
