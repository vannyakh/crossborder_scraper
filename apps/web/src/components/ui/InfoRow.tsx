import { HStack, Text } from '@chakra-ui/react'

/**
 * Shared label / value row used in detail drawers and info panels.
 * Replaces the identical `InfoRow` private component that was duplicated across
 * AgentRuleDetailDrawer, SkillDetailDrawer, DockerPanels, HardwareGaugeHoverDetail,
 * StorePluginSettingsDrawer, and DatabaseConfigDrawerPanels.
 */
export function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | number | null | undefined
  mono?: boolean
}) {
  const display = value == null || value === '' ? '—' : String(value)
  return (
    <HStack
      justify="space-between"
      py={2}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      gap={4}
      minW={0}
    >
      <Text fontSize="xs" color="fg.muted" flexShrink={0}>
        {label}
      </Text>
      <Text
        fontSize="xs"
        fontFamily={mono ? 'mono' : undefined}
        fontWeight="medium"
        textAlign="right"
        wordBreak="break-all"
      >
        {display}
      </Text>
    </HStack>
  )
}
