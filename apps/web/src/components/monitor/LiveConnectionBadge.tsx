import { Badge, HStack, Text } from '@chakra-ui/react'
import { Radio } from 'lucide-react'

export function LiveConnectionBadge({
  monitorOk,
  lastUpdated,
  connectedSockets,
  totalSockets,
}: {
  monitorOk: boolean
  lastUpdated?: number
  connectedSockets: number
  totalSockets: number
}) {
  const wsLabel =
    totalSockets === 0
      ? 'No active batches'
      : `${connectedSockets}/${totalSockets} WebSocket${totalSockets === 1 ? '' : 's'}`

  const updatedLabel = lastUpdated
    ? `Metrics · ${new Date(lastUpdated).toLocaleTimeString()}`
    : 'Metrics · polling'

  return (
    <HStack gap={2} flexWrap="wrap">
      <Badge
        colorPalette={monitorOk ? 'green' : 'orange'}
        variant="subtle"
        borderRadius="full"
        px={2.5}
        py={1}
      >
        <HStack gap={1.5}>
          <Radio size={12} strokeWidth={2} />
          <Text fontSize="xs">{updatedLabel}</Text>
        </HStack>
      </Badge>
      <Badge
        colorPalette={connectedSockets > 0 ? 'green' : totalSockets > 0 ? 'orange' : 'gray'}
        variant="subtle"
        borderRadius="full"
        px={2.5}
        py={1}
        fontSize="xs"
      >
        {wsLabel}
      </Badge>
    </HStack>
  )
}
