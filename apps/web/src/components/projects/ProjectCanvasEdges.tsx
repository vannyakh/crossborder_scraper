import type { ProjectEdge, ProjectNode } from './project-sample-data'
import { nodeCenter } from './ProjectNodeVisual'

export function ProjectCanvasEdges({
  nodes,
  edges,
  scale = 1,
  size = 'md',
}: {
  nodes: ProjectNode[]
  edges: ProjectEdge[]
  scale?: number
  size?: 'sm' | 'md'
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]))

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        <marker
          id="project-edge-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--chakra-colors-fg-muted)" opacity={0.7} />
        </marker>
      </defs>
      {edges.map((edge) => {
        const from = byId.get(edge.from)
        const to = byId.get(edge.to)
        if (!from || !to) return null
        const a = nodeCenter(from, size)
        const b = nodeCenter(to, size)
        const x1 = a.cx * scale
        const y1 = a.cy * scale
        const x2 = b.cx * scale
        const y2 = b.cy * scale
        const mx = (x1 + x2) / 2
        return (
          <path
            key={edge.id}
            d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke="var(--chakra-colors-border-emphasized)"
            strokeWidth={1.5}
            strokeOpacity={0.85}
            markerEnd="url(#project-edge-arrow)"
          />
        )
      })}
    </svg>
  )
}
