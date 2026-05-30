import { IconButton, Menu, Portal } from '@chakra-ui/react'
import { NodeToolbar, Position } from '@xyflow/react'
import { MoreHorizontal, Power, Trash2 } from 'lucide-react'
import type { HTMLAttributes } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useProjectFlowActions } from './project-flow-actions-context'
import { ProjectFlowNodeMenuPanel } from './ProjectFlowNodeMenuPanel'
import type { ProjectNode } from './project-sample-data'
import { roleForKind } from './project-node-meta'

type ProjectFlowNodeMenuProps = {
  nodeId: string
  node: ProjectNode
  visible: boolean
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  chromeHoverHandlers: HTMLAttributes<HTMLElement>
}

export function ProjectFlowNodeMenu({
  nodeId,
  node,
  visible,
  menuOpen,
  onMenuOpenChange,
  chromeHoverHandlers,
}: ProjectFlowNodeMenuProps) {
  const { t } = useLocale()
  const actions = useProjectFlowActions()
  const role = roleForKind(node.kind, node.role)
  const isConfig = role === 'config'
  const deactivated = node.status === 'offline'

  if (!actions || isConfig) return null

  return (
    <NodeToolbar
      nodeId={nodeId}
      isVisible
      position={Position.Top}
      align="center"
      offset={6}
      className={`project-flow-node-menu nodrag nopan${visible ? ' is-visible' : ''}`}
    >
      <div className="project-flow-node-menu__bar">
        <IconButton
          className={`project-flow-node-menu__btn${deactivated ? ' is-off' : ''}`}
          aria-label={
            deactivated ? t('projects.nodeMenu.activate') : t('projects.nodeMenu.deactivate')
          }
          aria-pressed={!deactivated}
          size="xs"
          variant="outline"
          {...chromeHoverHandlers}
          onClick={(event) => {
            event.stopPropagation()
            actions.toggleNodeActive(nodeId)
          }}
        >
          <Power size={14} strokeWidth={2} />
        </IconButton>

        <IconButton
          className="project-flow-node-menu__btn project-flow-node-menu__btn--danger"
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

        <Menu.Root
          open={menuOpen}
          onOpenChange={(details) => onMenuOpenChange(details.open)}
          positioning={{ placement: 'bottom' }}
          closeOnSelect
        >
          <Menu.Trigger asChild>
            <IconButton
              className="project-flow-node-menu__btn"
              aria-label={t('projects.nodeMenu.title', { name: node.label })}
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
              <ProjectFlowNodeMenuPanel nodeId={nodeId} />
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </div>
    </NodeToolbar>
  )
}
