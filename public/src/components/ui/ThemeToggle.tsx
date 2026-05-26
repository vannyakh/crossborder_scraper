import { HStack, IconButton, Text } from '@chakra-ui/react'
import { useTheme } from '../../hooks/use-theme'

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { resolved, toggle, isDark } = useTheme()

  return (
    <HStack gap={2}>
      {!compact ? (
        <Text fontSize="xs" color="fg.muted" textTransform="capitalize">
          {resolved} mode
        </Text>
      ) : null}
      <IconButton
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        size="sm"
        variant="outline"
        borderColor="border.subtle"
        borderRadius="input"
        onClick={toggle}
      >
        {isDark ? '☀️' : '🌙'}
      </IconButton>
    </HStack>
  )
}
