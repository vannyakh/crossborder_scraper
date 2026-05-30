import { Box, type BoxProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

/** Dot-grid backdrop matching the flow canvas. */
export function ProjectCanvasSurface({
  children,
  ...rest
}: BoxProps & {
  children: ReactNode
}) {
  return (
    <Box
      borderRadius="var(--radius-input)"
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border.subtle"
      overflow="hidden"
      backgroundImage="radial-gradient(circle, var(--chakra-colors-border-subtle) 1px, transparent 1px)"
      backgroundSize="12px 12px"
      {...rest}
    >
      {children}
    </Box>
  )
}
