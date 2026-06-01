import { Box } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import type { NodeVisualMeta } from './project-node-meta'

export function ProjectNodeIconTile({
  meta,
  size = 'md',
  round = 'md',
  children,
}: {
  meta: NodeVisualMeta
  size?: 'sm' | 'md' | 'lg'
  round?: 'md' | 'full'
  children: ReactNode
}) {
  const dim = size === 'sm' ? 32 : size === 'lg' ? 44 : 36

  return (
    <Box
      className="project-node-icon-tile"
      w={`${dim}px`}
      h={`${dim}px`}
      borderRadius={round === 'full' ? 'full' : '10px'}
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      style={{ background: meta.iconBg, color: meta.iconColor }}
    >
      {children}
    </Box>
  )
}
