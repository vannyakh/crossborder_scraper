import { IconButton, Menu, Portal } from '@chakra-ui/react'
import { NodeToolbar, Position } from '@xyflow/react'
import { MoreHorizontal, Play, Power, Trash2 } from 'lucide-react'
import type { HTMLAttributes } from 'react'
import { Tooltip } from '@/components/ui/tooltip'
import { useLocale } from '../../hooks/use-locale'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'
import { useProjectFlowActions } from './project-flow-actions-context'
import { ProjectFlowSubNodeMenuPanel } from './ProjectFlowSubNodeMenuPanel'
import type { ProjectNode } from './project-sample-data'
import { getSubNodeCapabilities } from './project-subnode-config'

type ProjectFlowSubNodeToolbarProps = {
  nodeId: string
  node: ProjectNode
  visible: boolean
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  chromeHoverHandlers: HTMLAttributes<HTMLElement>
}

/** Floating controls for config / plugin sub-nodes wired to agent slots. */
export function ProjectFlowSubNodeToolbar({
  nodeId,
  node,
  visible,
  menuOpen,
  onMenuOpenChange,
  chromeHoverHandlers,
}: ProjectFlowSubNodeToolbarProps) {
  const { t } = useLocale()
  const { project } = useProjectWorkspace()
  const actions = useProjectFlowActions()

  if (!actions) return null

  const { profile, toolbar } = getSubNodeCapabilities(project, node)
  const hasServiceStatus = node.status !== undefined
  const deactivated = node.status === 'offline'
  const powerLabel = hasServiceStatus
    ? deactivated
      ? t('projects.nodeMenu.activate')
      : t('projects.nodeMenu.deactivate')
    : t('projects.nodeMenu.deactivate')

  return (
    <NodeToolbar
      nodeId={nodeId}
      isVisible
      position={Position.Top}
      align="center"
      offset={8}
      className={`project-flow-subnode-toolbar nodrag nopan${visible ? ' is-visible' : ''}`}
      data-profile={profile}
    >
      <div className="project-flow-subnode-toolbar__bar">
        {toolbar.execute ? (
          <Tooltip
            content={t('projects.nodeMenu.executeStep')}
            positioning={{ placement: 'top' }}
            openDelay={200}
            showArrow
          >
            <IconButton
              className="project-flow-subnode-toolbar__btn"
              aria-label={t('projects.nodeMenu.executeStep')}
              size="xs"
              variant="outline"
              {...chromeHoverHandlers}
              onClick={(event) => {
                event.stopPropagation()
                actions.executeStep(nodeId)
              }}
            >
              <Play size={14} strokeWidth={2} />
            </IconButton>
          </Tooltip>
        ) : null}

        {toolbar.power ? (
          <Tooltip
            content={powerLabel}
            positioning={{ placement: 'top' }}
            openDelay={200}
            showArrow
          >
            <IconButton
              className={`project-flow-subnode-toolbar__btn${deactivated ? ' is-off' : ''}`}
              aria-label={powerLabel}
              aria-pressed={hasServiceStatus ? !deactivated : undefined}
              size="xs"
              variant="outline"
              {...chromeHoverHandlers}
              onClick={(event) => {
                event.stopPropagation()
                if (hasServiceStatus) {
                  actions.toggleNodeActive(nodeId)
                } else {
                  actions.previewNodeAction('deactivate')
                }
              }}
            >
              <Power size={14} strokeWidth={2} />
            </IconButton>
          </Tooltip>
        ) : null}

        {toolbar.remove ? (
          <Tooltip
            content={t('projects.nodeMenu.remove')}
            positioning={{ placement: 'top' }}
            openDelay={200}
            showArrow
          >
            <IconButton
              className="project-flow-subnode-toolbar__btn project-flow-subnode-toolbar__btn--danger"
              aria-label={t('projects.nodeMenu.remove')}
              size="xs"
              variant="outline"
              {...chromeHoverHandlers}
              onClick={(event) => {
                event.stopPropagation()
                actions.removeNode(nodeId)
              }}
            >
              <Trash2 size={14} strokeWidth={2} />
            </IconButton>
          </Tooltip>
        ) : null}

        {toolbar.more ? (
          <Menu.Root
            open={menuOpen}
            onOpenChange={(details) => onMenuOpenChange(details.open)}
            positioning={{ placement: 'bottom' }}
            closeOnSelect
          >
            <Menu.Trigger asChild>
              <IconButton
                className="project-flow-subnode-toolbar__btn"
                aria-label={t('projects.subNode.more')}
                size="xs"
                variant="outline"
                {...chromeHoverHandlers}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal size={16} strokeWidth={2} />
              </IconButton>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <ProjectFlowSubNodeMenuPanel nodeId={nodeId} node={node} />
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        ) : null}
      </div>
    </NodeToolbar>
  )
}
