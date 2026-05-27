import { HStack, IconButton, Text } from '@chakra-ui/react'
import { Moon, Sun } from 'lucide-react'
import { useLocale } from '../../hooks/use-locale'
import { useTheme } from '../../hooks/use-theme'

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { resolved, toggle, isDark } = useTheme()
  const { t } = useLocale()

  return (
    <HStack gap={2}>
      {!compact ? (
        <Text fontSize="xs" color="fg.muted" textTransform="capitalize">
          {t('theme.modeLabel', { mode: resolved })}
        </Text>
      ) : null}
      <IconButton
        aria-label={isDark ? t('theme.switchLightAria') : t('theme.switchDarkAria')}
        size="sm"
        variant="ghost"
        colorPalette="blue"
        borderRadius="input"
        onClick={toggle}
      >
        {isDark ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
      </IconButton>
    </HStack>
  )
}
