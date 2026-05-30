import { IconButton } from '@chakra-ui/react'
import { Brain } from 'lucide-react'

export function AgentThinkToggle({
  enabled,
  disabled,
  onToggle,
}: {
  enabled: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <IconButton
      size="sm"
      variant={enabled ? 'solid' : 'outline'}
      colorPalette={enabled ? 'green' : 'gray'}
      borderColor={enabled ? 'green.solid' : 'border.subtle'}
      borderRadius="input"
      aria-label={enabled ? 'Think mode on' : 'Think mode off'}
      aria-pressed={enabled}
      disabled={disabled}
      onClick={onToggle}
      boxShadow={
        enabled
          ? '0 0 0 2px var(--chakra-colors-bg-panel), 0 0 0 4px var(--chakra-colors-green-solid)'
          : undefined
      }
      _hover={
        enabled
          ? { filter: 'brightness(1.05)' }
          : { borderColor: 'border.emphasized', bg: 'bg.panelHover' }
      }
    >
      <Brain size={16} strokeWidth={2} />
    </IconButton>
  )
}
