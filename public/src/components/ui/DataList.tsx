import { Box, Table, type BoxProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

/** Table-style list — scroll + radius from global UI config */
export function DataList({
  children,
  maxH = 'min(70vh, 640px)',
  ...boxProps
}: BoxProps & {
  children: ReactNode
  maxH?: BoxProps['maxH']
}) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-panel)"
      overflow="hidden"
      bg="bg.panel"
      className="app-scroll"
      maxH={maxH}
      overflowY="auto"
      {...boxProps}
    >
      <Table.Root size="sm" variant="line">
        {children}
      </Table.Root>
    </Box>
  )
}

export function DataListEmpty({ children }: { children: ReactNode }) {
  return (
    <Box
      py={10}
      textAlign="center"
      fontSize="sm"
      color="fg.muted"
      borderRadius="var(--radius-panel)"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.panel"
    >
      {children}
    </Box>
  )
}
