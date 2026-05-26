import { Box, Heading, HStack, Text } from '@chakra-ui/react'
import { FadeIn } from '../motion/FadeIn'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <FadeIn className="mb-5">
      <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
        <Box>
          <Heading size="lg" fontFamily="heading" letterSpacing="-0.02em">
            {title}
          </Heading>
          {description ? (
            <Text mt={1} fontSize="sm" color="fg.muted">
              {description}
            </Text>
          ) : null}
        </Box>
        {action}
      </HStack>
    </FadeIn>
  )
}
