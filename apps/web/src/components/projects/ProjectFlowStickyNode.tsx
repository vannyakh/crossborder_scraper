import { Box, Textarea } from '@chakra-ui/react'
import { NodeResizer, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useColorMode } from '../../hooks/use-ui-config'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'
import { useProjectFlowActions } from './project-flow-actions-context'
import type { ProjectStickyNodeData } from './project-flow-types'
import {
  DEFAULT_STICKY_NOTE_COLOR,
  STICKY_NOTE_DEFAULT_H,
  STICKY_NOTE_DEFAULT_W,
  STICKY_NOTE_MAX_H,
  STICKY_NOTE_MAX_W,
  STICKY_NOTE_MIN_H,
  STICKY_NOTE_MIN_W,
  stickyNoteStyleVars,
  type StickyNoteColor,
} from './project-sticky-colors'
import { ProjectRemotePeerFocusBadge } from './ProjectRemotePeerFocusBadge'
import { ProjectFlowStickyToolbar } from './ProjectFlowStickyToolbar'

function labelFromMarkdown(body: string, fallback: string): string {
  const first = body
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)
  if (!first) return fallback
  return (
    first
      .replace(/^#{1,6}\s+/, '')
      .replace(/\*\*|__/g, '')
      .slice(0, 48) || fallback
  )
}

export function ProjectFlowStickyNode({
  id,
  data,
  selected,
  dragging,
  width,
  height,
}: NodeProps<Node<ProjectStickyNodeData, 'sticky'>>) {
  const { t } = useLocale()
  const colorMode = useColorMode()
  const { setProject, collaboration } = useProjectWorkspace()
  const { setNodes, getNode } = useReactFlow()
  const actions = useProjectFlowActions()
  const { node, beginEdit, remotePeerHighlights = [] } = data
  const primaryRemotePeer = remotePeerHighlights[0]
  const [editing, setEditing] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [bodyDraft, setBodyDraft] = useState(node.noteBody ?? '')
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const color: StickyNoteColor = node.noteColor ?? DEFAULT_STICKY_NOTE_COLOR

  const colorStyle = useMemo(
    () => stickyNoteStyleVars(color, colorMode as 'light' | 'dark'),
    [color, colorMode],
  )

  const startEditing = useCallback(() => {
    setBodyDraft(node.noteBody ?? '')
    setEditing(true)
  }, [node.noteBody])

  useEffect(() => {
    if (!beginEdit) return
    const frame = window.requestAnimationFrame(() => startEditing())
    return () => window.cancelAnimationFrame(frame)
  }, [beginEdit, startEditing])

  useEffect(() => {
    if (!editing) return
    const frame = window.requestAnimationFrame(() => {
      bodyRef.current?.focus()
      bodyRef.current?.select()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [editing])

  const persist = useCallback(
    (patch: {
      label?: string
      noteBody?: string
      noteWidth?: number
      noteHeight?: number
      noteColor?: StickyNoteColor
    }) => {
      setProject((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      }))
    },
    [id, setProject],
  )

  const syncFlowSize = useCallback(
    (nextWidth: number, nextHeight: number) => {
      setNodes((nodes) =>
        nodes.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                width: nextWidth,
                height: nextHeight,
              }
            : entry,
        ),
      )
    },
    [id, setNodes],
  )

  const endEdit = useCallback(() => {
    actions?.endStickyEdit()
  }, [actions])

  const commitEdit = useCallback(() => {
    const nextBody = bodyDraft.trim()
    const nextLabel = labelFromMarkdown(nextBody, t('projects.sticky.defaultTitle'))
    persist({ label: nextLabel, noteBody: nextBody })
    setBodyDraft(nextBody)
    setEditing(false)
    endEdit()
  }, [bodyDraft, endEdit, persist, t])

  const cancelEdit = useCallback(() => {
    setBodyDraft(node.noteBody ?? '')
    setEditing(false)
    endEdit()
  }, [endEdit, node.noteBody])

  const handleColorChange = useCallback(
    (next: StickyNoteColor) => {
      persist({ noteColor: next })
      setNodes((nodes) =>
        nodes.map((entry) => {
          if (entry.id !== id || entry.type !== 'sticky') return entry
          const stickyData = entry.data as ProjectStickyNodeData
          return {
            ...entry,
            data: {
              ...stickyData,
              node: { ...stickyData.node, noteColor: next },
            },
          }
        }),
      )
    },
    [id, persist, setNodes],
  )

  const wrapClass = [
    'project-flow-sticky-wrap',
    'project-flow-sticky-wrap--interaction',
    primaryRemotePeer ? 'project-flow-sticky-wrap--remote-peer' : '',
    selected ? 'project-flow-sticky-wrap--selected' : '',
    editing ? 'project-flow-sticky-wrap--editing' : '',
    dragging ? 'project-flow-sticky-wrap--dragging' : '',
    resizing ? 'project-flow-sticky-wrap--resizing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const nodeWidth = width ?? node.noteWidth ?? STICKY_NOTE_DEFAULT_W
  const nodeHeight = height ?? node.noteHeight ?? STICKY_NOTE_DEFAULT_H

  return (
    <Box
      className={wrapClass}
      data-color={color}
      style={{
        ...colorStyle,
        ...(primaryRemotePeer
          ? ({ '--remote-peer-color': primaryRemotePeer.color } as CSSProperties)
          : {}),
      }}
      w={`${nodeWidth}px`}
      h={`${nodeHeight}px`}
      onDoubleClick={(event) => {
        event.stopPropagation()
        startEditing()
      }}
    >
      {remotePeerHighlights.length > 0 ? (
        <ProjectRemotePeerFocusBadge peers={remotePeerHighlights} />
      ) : null}
      {selected && !editing ? (
        <ProjectFlowStickyToolbar nodeId={id} color={color} onColorChange={handleColorChange} />
      ) : null}

      <NodeResizer
        isVisible={selected && !editing}
        minWidth={STICKY_NOTE_MIN_W}
        minHeight={STICKY_NOTE_MIN_H}
        maxWidth={STICKY_NOTE_MAX_W}
        maxHeight={STICKY_NOTE_MAX_H}
        lineClassName="project-flow-sticky-resize-line"
        handleClassName="project-flow-sticky-resize-handle"
        onResizeStart={() => setResizing(true)}
        onResize={(_event, params) => {
          syncFlowSize(params.width, params.height)
        }}
        onResizeEnd={(_event, params) => {
          setResizing(false)
          const nextWidth = Math.round(params.width)
          const nextHeight = Math.round(params.height)
          syncFlowSize(nextWidth, nextHeight)
          persist({ noteWidth: nextWidth, noteHeight: nextHeight })
          const flowNode = getNode(id)
          collaboration.publishLayout([
            {
              id,
              x: flowNode?.position.x ?? node.x,
              y: flowNode?.position.y ?? node.y,
              noteWidth: nextWidth,
              noteHeight: nextHeight,
            },
          ])
        }}
      />

      <Box className="project-flow-sticky-node project-flow-sticky-node--interaction">
        {editing ? (
          <Textarea
            ref={bodyRef}
            className="project-flow-sticky-node__body-input"
            value={bodyDraft}
            variant="outline"
            resize="none"
            placeholder={t('projects.sticky.bodyPlaceholder')}
            onChange={(event) => setBodyDraft(event.target.value)}
            onBlur={commitEdit}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                cancelEdit()
              }
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                commitEdit()
              }
            }}
          />
        ) : null}
      </Box>
    </Box>
  )
}
