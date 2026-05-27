import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { useAccentPalette } from '../../hooks/use-ui-config'

export function SettingsSaveBar({
  message,
  saving,
  testing,
  onSave,
  onTestLlm,
  showTest,
}: {
  message: string
  saving: boolean
  testing: boolean
  onSave: () => void
  onTestLlm?: () => void
  showTest?: boolean
}) {
  const accentPalette = useAccentPalette()
  const isError = message.includes('HTTP') || message.toLowerCase().includes('error')

  return (
    <Box
      position="sticky"
      bottom={0}
      mt={6}
      mx={{ base: -3, md: 0 }}
      px={{ base: 3, md: 4 }}
      py={3}
      borderTopWidth="1px"
      borderColor="border.subtle"
      bg="bg.panel"
      backdropFilter="blur(8px)"
      zIndex={2}
      borderRadius={{ md: 'var(--radius-panel)' }}
      boxShadow="0 -4px 24px color-mix(in srgb, var(--app-accent) 6%, transparent)"
    >
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <HStack gap={2} flexWrap="wrap">
          <Button
            size="sm"
            colorPalette={accentPalette}
            borderRadius="var(--radius-input)"
            loading={saving}
            onClick={onSave}
          >
            Save settings
          </Button>
          {showTest && onTestLlm ? (
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              borderRadius="var(--radius-input)"
              loading={testing}
              onClick={onTestLlm}
            >
              Test LLM
            </Button>
          ) : null}
        </HStack>
        {message ? (
          <Text fontSize="sm" color={isError ? 'red.500' : 'fg.muted'} maxW="480px">
            {message}
          </Text>
        ) : (
          <Text fontSize="xs" color="fg.subtle">
            Changes apply after save · config/ui_config.json
          </Text>
        )}
      </HStack>
    </Box>
  )
}
