import { Box, Text } from '@chakra-ui/react'
import { formatServerErrorMessage } from '../../lib/format-server-error'

/**
 * Inline query error display — replaces the 13+ copies of
 * `<Text color="red.500">{String((error as Error).message || error)}</Text>`
 * scattered across panel components.
 *
 * Usage:
 *   {myQuery.isError && <QueryErrorBanner error={myQuery.error} />}
 */
export function QueryErrorBanner({
  error,
  label,
}: {
  error: unknown
  label?: string
}) {
  const message = formatServerErrorMessage(error)
  return (
    <Box
      px={4}
      py={3}
      borderWidth="1px"
      borderColor="red.muted"
      borderRadius="var(--radius-card)"
      bg="red.subtle"
    >
      {label ? (
        <Text fontSize="xs" fontWeight="semibold" color="red.600" mb={0.5}>
          {label}
        </Text>
      ) : null}
      <Text fontSize="xs" color="red.700">
        {message}
      </Text>
    </Box>
  )
}
