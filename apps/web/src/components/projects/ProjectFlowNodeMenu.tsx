import { IconButton, Menu, Portal } from '@chakra-ui/react'
import { NodeToolbar, Position } from '@xyflow/react'
import { MoreHorizontal } from 'lucide-react'
import type { HTMLAttributes } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useProjectFlowActions } from './project-flow-actions-context'
import { ProjectFlowNodeMenuPanel } from './ProjectFlowNodeMenuPanel'
import type { ProjectNode } from './project-sample-data'

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

  if (!actions) return null

  return (
    <NodeToolbar
      nodeId={nodeId}
      isVisible
      position={Position.Top}
      align="center"
      offset={4}
      className={`project-flow-node-menu nodrag nopan${visible ? ' is-visible' : ''}`}
    >
      <Menu.Root
        open={menuOpen}
        onOpenChange={(details) => onMenuOpenChange(details.open)}
        positioning={{ placement: 'bottom' }}
        closeOnSelect
      >
        <Menu.Trigger asChild>
          <IconButton
            className="project-flow-node-menu__trigger"
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
    </NodeToolbar>
  )
}
