import { IconButton } from '@chakra-ui/react'
import { NodeToolbar, Position } from '@xyflow/react'
import { Plus } from 'lucide-react'
import type { HTMLAttributes } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useProjectFlowActions } from './project-flow-actions-context'

type ProjectFlowNodeAddHandleProps = {
  nodeId: string
  visible: boolean
  chromeHoverHandlers: HTMLAttributes<HTMLElement>
}

/** Add-step control on the main output — opens the node picker wired to the source step. */
export function ProjectFlowNodeAddHandle({
  nodeId,
  visible,
  chromeHoverHandlers,
}: ProjectFlowNodeAddHandleProps) {
  const { t } = useLocale()
  const actions = useProjectFlowActions()

  if (!actions) return null

  return (
    <NodeToolbar
      nodeId={nodeId}
      isVisible
      position={Position.Right}
      align="center"
      offset={8}
      className={`project-flow-node-add nodrag nopan${visible ? ' is-visible' : ''}`}
    >
      <IconButton
        className="project-flow-node-add__btn"
        aria-label={t('projects.flow.addStepAfter')}
        size="xs"
        variant="outline"
        colorPalette="gray"
        {...chromeHoverHandlers}
        onClick={(event) => {
          event.stopPropagation()
          actions.openAddAfter(nodeId)
        }}
      >
        <Plus size={14} strokeWidth={2.5} />
      </IconButton>
    </NodeToolbar>
  )
}
