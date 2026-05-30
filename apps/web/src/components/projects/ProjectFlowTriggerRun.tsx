import { Button } from '@chakra-ui/react'
import { NodeToolbar, Position } from '@xyflow/react'
import { FlaskConical, Square } from 'lucide-react'
import type { HTMLAttributes } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { useProjectFlowActions } from './project-flow-actions-context'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'

type ProjectFlowTriggerRunProps = {
  nodeId: string
  visible: boolean
  chromeHoverHandlers: HTMLAttributes<HTMLElement>
}

/** n8n-style “Execute workflow” control anchored left of trigger nodes. */
export function ProjectFlowTriggerRun({
  nodeId,
  visible,
  chromeHoverHandlers,
}: ProjectFlowTriggerRunProps) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const actions = useProjectFlowActions()
  const { running, setRunning } = useProjectWorkspace()

  if (!actions) return null

  return (
    <NodeToolbar
      nodeId={nodeId}
      isVisible
      position={Position.Left}
      align="center"
      offset={12}
      className={`project-flow-trigger-run nodrag nopan${visible ? ' is-visible' : ''}`}
    >
      <Button
        className="project-flow-trigger-run__btn"
        size="xs"
        colorPalette={running ? undefined : accentPalette}
        variant={running ? 'outline' : 'solid'}
        {...chromeHoverHandlers}
        onClick={(event) => {
          event.stopPropagation()
          if (running) {
            setRunning(false)
          } else {
            actions.runWorkflow()
          }
        }}
      >
        {running ? <Square size={14} /> : <FlaskConical size={14} />}
        {running ? t('projects.stopFlow') : t('projects.executeWorkflow')}
      </Button>
    </NodeToolbar>
  )
}
