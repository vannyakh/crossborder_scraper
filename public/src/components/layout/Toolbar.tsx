import { Box, HStack, Heading, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { FadeIn } from '../motion/FadeIn'

/** Top bar for main content — similar to Alist folder toolbar */
export function Toolbar({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <FadeIn>
      <Box
        mb="var(--content-gap)"
        pb={3}
        borderBottomWidth="1px"
        borderColor="border.subtle"
      >
        <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
          <Box minW={0}>
            <Heading size="md" fontWeight="semibold" letterSpacing="-0.01em">
              {title}
            </Heading>
            {description ? (
              <Text mt={0.5} fontSize="sm" color="fg.muted">
                {description}
              </Text>
            ) : null}
          </Box>
          {actions ? (
            <HStack gap={2} flexShrink={0} flexWrap="wrap">
              {actions}
            </HStack>
          ) : null}
        </HStack>
      </Box>
    </FadeIn>
  )
}
