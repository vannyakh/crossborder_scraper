import { Box, HStack, Text, type BoxProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export function SectionDivider({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <HStack gap={2} align="center" w="full">
      <Box w={6} minW={6} borderTopWidth="1px" borderColor="border.subtle" aria-hidden />
      <Text fontSize="md" fontWeight="semibold" color="fg" whiteSpace="nowrap" letterSpacing="0.01em">
        {title}
      </Text>
      <Box flex={1} minW={8} borderTopWidth="1px" borderColor="border.subtle" aria-hidden />
      {action}
    </HStack>
  )
}

export function Section({
  title,
  description,
  action,
  children,
  mt = 5,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  mt?: number | string
}) {
  return (
    <Box mt={mt}>
      <SectionDivider title={title} action={action} />
      {description ? (
        <Text mt={1.5} fontSize="sm" color="fg.muted">
          {description}
        </Text>
      ) : null}
      <Box pt={description ? 3 : 2.5}>{children}</Box>
    </Box>
  )
}

/** Bordered content surface inside a section divider block */
export function SectionCard({
  children,
  p = { base: 3, md: 4 },
  ...rest
}: BoxProps & {
  children: ReactNode
  p?: number | string | Record<string, number | string>
}) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-panel)"
      bg="bg.elevated"
      overflow="hidden"
      p={p}
      {...rest}
    >
      {children}
    </Box>
  )
}
