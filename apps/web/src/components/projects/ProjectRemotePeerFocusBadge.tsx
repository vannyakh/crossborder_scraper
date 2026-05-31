import { Box, Text } from '@chakra-ui/react'
import type { CSSProperties } from 'react'
import { Tooltip } from '@/components/ui/tooltip'
import { useLocale } from '../../hooks/use-locale'
import { formatCollaboratorDisplayName, peerInitials } from '../../lib/api/project-collaboration'
import type { RemotePeerHighlight } from './project-flow-types'

type ProjectRemotePeerFocusBadgeProps = {
  peers: RemotePeerHighlight[]
}

export function ProjectRemotePeerFocusBadge({ peers }: ProjectRemotePeerFocusBadgeProps) {
  const { t } = useLocale()
  if (peers.length === 0) return null

  const primary = peers[0]!
  const extra = peers.length - 1
  const primaryName = formatCollaboratorDisplayName(primary.username)
  const tooltip =
    extra > 0
      ? peers
          .map((peer) =>
            t('projects.collaboration.peerFocus', {
              name: formatCollaboratorDisplayName(peer.username),
            }),
          )
          .join('\n')
      : t('projects.collaboration.peerFocus', { name: primaryName })

  return (
    <Tooltip content={tooltip}>
      <Box
        className="project-flow-remote-peer-badge"
        style={{ '--remote-peer-color': primary.color } as CSSProperties}
        aria-label={tooltip}
      >
        <Box className="project-flow-remote-peer-badge__dot" aria-hidden />
        <Text className="project-flow-remote-peer-badge__name" lineClamp={1}>
          {primaryName}
        </Text>
        {extra > 0 ? (
          <Text className="project-flow-remote-peer-badge__more" aria-hidden>
            +{extra}
          </Text>
        ) : null}
        <Text className="project-flow-remote-peer-badge__initials" aria-hidden>
          {peerInitials(primaryName)}
        </Text>
      </Box>
    </Tooltip>
  )
}
