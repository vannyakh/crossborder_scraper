import { Avatar, Badge, HStack, Text } from '@chakra-ui/react'
import { Tooltip } from '@/components/ui/tooltip'
import {
  formatCollaboratorDisplayName,
  peerAccentColor,
  peerInitials,
  type ProjectPresenceGuest,
} from '../../lib/api/project-collaboration'
import { useLocale } from '../../hooks/use-locale'

type ProjectActiveGuestsProps = {
  guests: ProjectPresenceGuest[]
  compact?: boolean
}

export function ProjectActiveGuests({ guests, compact = false }: ProjectActiveGuestsProps) {
  const { t } = useLocale()
  if (guests.length === 0) return null

  const visible = guests.slice(0, compact ? 3 : 4)
  const extra = guests.length - visible.length

  return (
    <HStack gap={2} flexShrink={0} align="center">
      <Badge
        size="sm"
        variant="subtle"
        colorPalette="green"
        textTransform="none"
        fontWeight="medium"
      >
        {t('projects.collaboration.guestsActive', { count: String(guests.length) })}
      </Badge>
      <HStack className="project-collaborators__stack" gap={0}>
        {visible.map((guest) => {
          const displayName = formatCollaboratorDisplayName(guest.username)
          return (
            <Tooltip
              key={guest.clientId}
              content={t('projects.collaboration.peerFocus', { name: displayName })}
            >
              <Avatar.Root
                size="2xs"
                borderWidth="2px"
                borderColor={peerAccentColor(guest.clientId)}
                aria-label={displayName}
              >
                <Avatar.Fallback
                  name={displayName}
                  bg={peerAccentColor(guest.clientId)}
                  color="white"
                  fontSize="2xs"
                  fontWeight="bold"
                >
                  {peerInitials(displayName)}
                </Avatar.Fallback>
              </Avatar.Root>
            </Tooltip>
          )
        })}
        {extra > 0 ? (
          <Text fontSize="2xs" color="fg.muted" pl={0.5}>
            +{extra}
          </Text>
        ) : null}
      </HStack>
    </HStack>
  )
}

export function buildPreviewNodeFocusColors(guests: ProjectPresenceGuest[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const guest of guests) {
    if (!guest.selectedNodeId || map.has(guest.selectedNodeId)) continue
    map.set(guest.selectedNodeId, peerAccentColor(guest.clientId))
  }
  return map
}
