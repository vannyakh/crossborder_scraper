import { Box, Table } from '@chakra-ui/react'
import type { ReactNode } from 'react'

/** Table-style list like Alist file browser */
export function DataList({ children }: { children: ReactNode }) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="panel"
      overflow="hidden"
      bg="bg.panel"
    >
      <Table.Root size="sm" variant="line">
        {children}
      </Table.Root>
    </Box>
  )
}

export function DataListEmpty({ children }: { children: ReactNode }) {
  return (
    <Box py={10} textAlign="center" fontSize="sm" color="fg.muted">
      {children}
    </Box>
  )
}
