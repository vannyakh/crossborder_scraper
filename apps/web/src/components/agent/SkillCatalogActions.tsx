import { Button, HStack } from '@chakra-ui/react'
import { Settings } from 'lucide-react'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { GatewaySkill } from '../../lib/api'

export function SkillCatalogActions({
  skill,
  busy,
  onToggle,
  onDetails,
}: {
  skill: GatewaySkill
  busy: boolean
  onToggle: (id: string, enabled: boolean) => void
  onDetails: (id: string) => void
}) {
  const accentPalette = useAccentPalette()

  return (
    <HStack gap={2} w="full">
      <Button
        size="sm"
        flex={1}
        colorPalette={accentPalette}
        borderRadius="var(--radius-input)"
        disabled={busy}
        onClick={() => onToggle(skill.id, !skill.enabled)}
      >
        {skill.enabled ? 'Disable' : 'Enable'}
      </Button>
      <Button
        size="sm"
        flex={1}
        variant="outline"
        borderColor="border.subtle"
        borderRadius="var(--radius-input)"
        onClick={() => onDetails(skill.id)}
      >
        <Settings size={14} />
        Details
      </Button>
    </HStack>
  )
}
