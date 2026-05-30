import { Handle, Position, type Position as HandlePosition } from '@xyflow/react'
import { useLocale } from '../../hooks/use-locale'

const HANDLE_CLASS = 'project-flow-handle'

type ProjectFlowMainOutHandleProps = {
  showAddStep: boolean
  position?: HandlePosition
  className?: string
}

export function ProjectFlowMainOutHandle({
  showAddStep,
  position = Position.Right,
  className = '',
}: ProjectFlowMainOutHandleProps) {
  const { t } = useLocale()
  const classes = [
    HANDLE_CLASS,
    showAddStep ? 'project-flow-handle--add-step' : 'project-flow-handle--main-out',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Handle
      type="source"
      position={position}
      id="main-out"
      className={classes}
      isConnectableStart={showAddStep}
      aria-label={showAddStep ? t('projects.flow.addStepAfter') : undefined}
    />
  )
}
