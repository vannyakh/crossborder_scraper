import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { ProjectFlowEdgeHover } from './ProjectFlowEdgeHover'

/** Solid main-path edge between workflow steps */
export function ProjectFlowMainEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className="project-flow-edge-path project-flow-edge-path--main"
        style={{
          ...style,
          strokeWidth: 1.5,
          stroke: 'var(--project-flow-edge)',
        }}
      />
      <ProjectFlowEdgeHover
        edgeId={id}
        path={path}
        labelX={labelX}
        labelY={labelY}
        variant="main"
        source={source}
        target={target}
      />
    </>
  )
}
