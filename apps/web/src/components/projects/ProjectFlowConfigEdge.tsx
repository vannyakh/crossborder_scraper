import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import type { ProjectFlowEdgeData } from './project-flow-types'

/**
 * Service / config wiring — dashed, muted, drawn under main workflow edges.
 */
export function ProjectFlowConfigEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const pathOffset = (data as ProjectFlowEdgeData | undefined)?.pathOffset ?? 0

  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
    offset: pathOffset,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className="project-flow-edge-path project-flow-edge-path--network"
        style={{
          strokeDasharray: '5 6',
          strokeWidth: 1.5,
          stroke: 'var(--project-flow-edge-network)',
          fill: 'none',
        }}
      />
    </>
  )
}
