import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { FadeIn } from '../motion/FadeIn'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { DEFAULT_SERVER_ERROR_HINT, formatServerErrorMessage } from '../../lib/format-server-error'
import serverErrorAnimation from '../../assets/lottie/server-error.json'
import { LottieAnimation } from './LottieAnimation'

export type ServerErrorStateProps = {
  title?: string
  message?: string
  hint?: string
  error?: unknown
  onRetry?: () => void
  retrying?: boolean
  secondaryAction?: ReactNode
  compact?: boolean
}

export function ServerErrorState({
  title = 'Server unavailable',
  message,
  hint = DEFAULT_SERVER_ERROR_HINT,
  error,
  onRetry,
  retrying = false,
  secondaryAction,
  compact = false,
}: ServerErrorStateProps) {
  const accentPalette = useAccentPalette()
  const detail = message ?? (error !== undefined ? formatServerErrorMessage(error) : undefined)

  return (
    <FadeIn>
      <VStack gap={compact ? 3 : 4} textAlign="center" px={compact ? 0 : 4} py={compact ? 2 : 6}>
        <LottieAnimation animationData={serverErrorAnimation} size={compact ? 200 : 280} />
        <VStack gap={2} maxW="md">
          <Text fontSize={compact ? 'lg' : '2xl'} fontWeight="semibold" color="fg">
            {title}
          </Text>
          {detail ? (
            <Text fontSize="sm" color="fg.muted" lineHeight="tall">
              {detail}
            </Text>
          ) : null}
          {hint ? (
            <Box
              fontSize="xs"
              color="fg.subtle"
              lineHeight="tall"
              textAlign="center"
              px={3}
              py={2}
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="var(--radius-input)"
              bg="bg.subtle"
            >
              {hint}
            </Box>
          ) : null}
        </VStack>
        {onRetry || secondaryAction ? (
          <HStack gap={2} flexWrap="wrap" justify="center">
            {onRetry ? (
              <Button
                size="sm"
                colorPalette={accentPalette}
                borderRadius="input"
                loading={retrying}
                onClick={onRetry}
              >
                <RefreshCw size={14} />
                Try again
              </Button>
            ) : null}
            {secondaryAction}
          </HStack>
        ) : null}
      </VStack>
    </FadeIn>
  )
}
