import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

/** Solid main-path edge between workflow steps */
export function ProjectFlowMainEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 20,
  })

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      className="project-flow-edge-path project-flow-edge-path--main"
      style={{
        ...style,
        strokeWidth: 2.5,
        stroke: 'var(--project-flow-edge)',
      }}
    />
  )
}
