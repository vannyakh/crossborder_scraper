import { ViewportPortal, useStore } from '@xyflow/react'
import { useCallback } from 'react'
import type { ProjectStickyFlowNode } from './project-flow-types'
import { ProjectFlowStickyVisual } from './ProjectFlowStickyVisual'
import { STICKY_NOTE_DEFAULT_H, STICKY_NOTE_DEFAULT_W } from './project-sticky-colors'

function stickyNodesSelector(state: {
  nodeLookup: Map<
    string,
    {
      type?: string
      id: string
      position: { x: number; y: number }
      width?: number
      height?: number
      data: unknown
    }
  >
}) {
  const stickies: ProjectStickyFlowNode[] = []
  for (const node of state.nodeLookup.values()) {
    if (node.type === 'sticky') {
      stickies.push(node as ProjectStickyFlowNode)
    }
  }
  return stickies
}

/** Sticky visuals below edges; interaction handles stay on transparent RF nodes. */
export function ProjectFlowStickyPortal() {
  const stickies = useStore(useCallback((state) => stickyNodesSelector(state), []))

  return (
    <ViewportPortal>
      <div className="project-flow-sticky-portal" aria-hidden={stickies.length === 0}>
        {stickies.map((flowNode) => {
          const data = flowNode.data
          const width = flowNode.width ?? data.node.noteWidth ?? STICKY_NOTE_DEFAULT_W
          const height = flowNode.height ?? data.node.noteHeight ?? STICKY_NOTE_DEFAULT_H
          return (
            <div
              key={flowNode.id}
              className="project-flow-sticky-portal__item"
              style={{
                transform: `translate(${flowNode.position.x}px, ${flowNode.position.y}px)`,
                width,
                height,
              }}
            >
              <ProjectFlowStickyVisual node={data.node} width={width} height={height} />
            </div>
          )
        })}
      </div>
    </ViewportPortal>
  )
}
