import { Avatar, Badge, HStack, Text } from '@chakra-ui/react'
import { Tooltip } from '@/components/ui/tooltip'
import {
  peerAccentColor,
  peerInitials,
  type ProjectCollaboratorPeer,
} from '../../lib/api/project-collaboration'
import { useLocale } from '../../hooks/use-locale'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'

function CollaboratorAvatar({ peer, isSelf }: { peer: ProjectCollaboratorPeer; isSelf?: boolean }) {
  const color = peerAccentColor(peer.clientId)
  const label = isSelf ? `${peer.username} (you)` : peer.username

  return (
    <Tooltip content={label}>
      <Avatar.Root size="xs" borderWidth="2px" borderColor={color} title={label} aria-label={label}>
        <Avatar.Fallback
          name={peer.username}
          bg={color}
          color="white"
          fontSize="2xs"
          fontWeight="bold"
        >
          {peerInitials(peer.username)}
        </Avatar.Fallback>
      </Avatar.Root>
    </Tooltip>
  )
}

export function ProjectCollaborators() {
  const { t } = useLocale()
  const { collaboration } = useProjectWorkspace()
  const { peers, connected, reconnecting, clientId } = collaboration

  const visiblePeers = peers.length > 0 ? peers : []
  const others = visiblePeers.filter((p) => p.clientId !== clientId)
  const self = visiblePeers.find((p) => p.clientId === clientId)

  if (!connected && !reconnecting && others.length === 0) {
    return null
  }

  const statusLabel = reconnecting
    ? t('projects.collaboration.reconnecting')
    : connected
      ? t('projects.collaboration.live', { count: String(Math.max(others.length + 1, 1)) })
      : t('projects.collaboration.offline')

  return (
    <HStack gap={2} flexShrink={0}>
      <Badge
        size="sm"
        variant="subtle"
        colorPalette={connected ? 'green' : reconnecting ? 'orange' : 'gray'}
        textTransform="none"
        fontWeight="medium"
      >
        {statusLabel}
      </Badge>
      <HStack className="project-collaborators__stack" gap={0}>
        {self ? <CollaboratorAvatar peer={self} isSelf /> : null}
        {others.slice(0, 4).map((peer) => (
          <CollaboratorAvatar key={peer.clientId} peer={peer} />
        ))}
        {others.length > 4 ? (
          <Text fontSize="xs" color="fg.muted" pl={1}>
            +{others.length - 4}
          </Text>
        ) : null}
      </HStack>
    </HStack>
  )
}
