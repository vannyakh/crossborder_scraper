import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type ProjectCollaborationState,
  type ProjectCollaboratorPeer,
  type ProjectNodeLayoutPatch,
} from '../../lib/api/project-collaboration'
import { mapProjectDetail, type ApiProjectDetail } from '../../lib/api/project-map'
import { connectProjectWebSocket } from '../../lib/api/ws'
import { useAuthStore } from '../../stores/auth-store'
import type { ProjectDetail } from './project-sample-data'

const RECONNECT_MS = 2500

type UseProjectCollaborationOptions = {
  projectId: string
  clientId: string
  enabled: boolean
  flowRevision: number
  onRemoteFlow: (project: ProjectDetail) => void
  onRemoteLayout?: (patches: ProjectNodeLayoutPatch[]) => void
}

export function useProjectCollaboration({
  projectId,
  clientId,
  enabled,
  flowRevision,
  onRemoteFlow,
  onRemoteLayout,
}: UseProjectCollaborationOptions): ProjectCollaborationState {
  const username = useAuthStore((s) => s.username) ?? 'guest'
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [peers, setPeers] = useState<ProjectCollaboratorPeer[]>([])
  const [remoteSelections, setRemoteSelections] = useState<Record<string, string | null>>({})
  const onRemoteFlowRef = useRef(onRemoteFlow)
  const onRemoteLayoutRef = useRef(onRemoteLayout)
  const localRevisionRef = useRef(flowRevision)
  const socketRef = useRef<ReturnType<typeof connectProjectWebSocket> | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    onRemoteFlowRef.current = onRemoteFlow
  }, [onRemoteFlow])

  useEffect(() => {
    onRemoteLayoutRef.current = onRemoteLayout
  }, [onRemoteLayout])

  useEffect(() => {
    localRevisionRef.current = flowRevision
  }, [flowRevision])

  const mapPeers = useCallback((raw: unknown): ProjectCollaboratorPeer[] => {
    if (!Array.isArray(raw)) return []
    return raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const row = item as Record<string, unknown>
        const id = String(row.client_id ?? '')
        if (!id) return null
        return {
          clientId: id,
          username: String(row.username ?? 'guest'),
          selectedNodeId:
            row.selected_node_id === null || row.selected_node_id === undefined
              ? null
              : String(row.selected_node_id),
        }
      })
      .filter((p): p is ProjectCollaboratorPeer => p !== null)
  }, [])

  const applyPeers = useCallback(
    (raw: unknown) => {
      const next = mapPeers(raw)
      setPeers(next)
      const selections: Record<string, string | null> = {}
      for (const peer of next) {
        if (peer.clientId !== clientId) {
          selections[peer.clientId] = peer.selectedNodeId
        }
      }
      setRemoteSelections(selections)
    },
    [clientId, mapPeers],
  )

  const publishSelection = useCallback(
    (nodeId: string | null) => {
      socketRef.current?.send({ action: 'selection', node_id: nodeId })
      setPeers((prev) =>
        prev.map((peer) =>
          peer.clientId === clientId ? { ...peer, selectedNodeId: nodeId } : peer,
        ),
      )
    },
    [clientId],
  )

  const mapLayoutPatches = useCallback((raw: unknown): ProjectNodeLayoutPatch[] => {
    if (!Array.isArray(raw)) return []
    const patches: ProjectNodeLayoutPatch[] = []
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const id = String(row.id ?? '')
      const x = Number(row.x)
      const y = Number(row.y)
      if (!id || !Number.isFinite(x) || !Number.isFinite(y)) continue
      const patch: ProjectNodeLayoutPatch = { id, x, y }
      const noteWidth = Number(row.note_width ?? row.noteWidth)
      const noteHeight = Number(row.note_height ?? row.noteHeight)
      if (Number.isFinite(noteWidth)) patch.noteWidth = noteWidth
      if (Number.isFinite(noteHeight)) patch.noteHeight = noteHeight
      patches.push(patch)
    }
    return patches
  }, [])

  const publishLayout = useCallback((patches: ProjectNodeLayoutPatch[]) => {
    if (patches.length === 0) return
    socketRef.current?.send({
      action: 'layout',
      nodes: patches.map((patch) => ({
        id: patch.id,
        x: patch.x,
        y: patch.y,
        ...(patch.noteWidth !== undefined ? { note_width: patch.noteWidth } : {}),
        ...(patch.noteHeight !== undefined ? { note_height: patch.noteHeight } : {}),
      })),
    })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current)
      }
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled || !projectId) {
      if (mountedRef.current) {
        setConnected(false)
        setReconnecting(false)
        setPeers([])
        setRemoteSelections({})
        socketRef.current?.close()
        socketRef.current = null
      }
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const connect = () => {
      if (cancelled) return
      socketRef.current?.close()
      setReconnecting(Boolean(socketRef.current))

      socketRef.current = connectProjectWebSocket(projectId, clientId, {
        signal: controller.signal,
        onOpen: () => {
          if (!mountedRef.current) return
          setConnected(true)
          setReconnecting(false)
        },
        onEvent: (event, data) => {
          if (!mountedRef.current) return

          if (event === 'welcome') {
            const payload = data as Record<string, unknown>
            applyPeers(payload.peers)
            const projectRaw = payload.project as ApiProjectDetail | undefined
            if (projectRaw) {
              const remote = mapProjectDetail(projectRaw)
              if ((remote.flowRevision ?? 0) > localRevisionRef.current) {
                onRemoteFlowRef.current(remote)
              }
            }
            return
          }

          if (event === 'peers') {
            applyPeers((data as Record<string, unknown>)?.peers)
            return
          }

          if (event === 'selection') {
            const payload = data as Record<string, unknown>
            const peerId = String(payload.client_id ?? '')
            if (!peerId || peerId === clientId) return
            const nodeId =
              payload.node_id === null || payload.node_id === undefined
                ? null
                : String(payload.node_id)
            setRemoteSelections((prev) => ({ ...prev, [peerId]: nodeId }))
            setPeers((prev) =>
              prev.map((peer) =>
                peer.clientId === peerId ? { ...peer, selectedNodeId: nodeId } : peer,
              ),
            )
            return
          }

          if (event === 'flow_updated') {
            const payload = data as Record<string, unknown>
            const sourceId = payload.client_id ? String(payload.client_id) : null
            if (sourceId && sourceId === clientId) return
            const projectRaw = payload.project as ApiProjectDetail | undefined
            if (!projectRaw) return
            const remote = mapProjectDetail(projectRaw)
            if ((remote.flowRevision ?? 0) <= localRevisionRef.current) return
            onRemoteFlowRef.current(remote)
            return
          }

          if (event === 'layout') {
            const payload = data as Record<string, unknown>
            const sourceId = payload.client_id ? String(payload.client_id) : null
            if (sourceId && sourceId === clientId) return
            const patches = mapLayoutPatches(payload.nodes)
            if (patches.length === 0) return
            onRemoteLayoutRef.current?.(patches)
            return
          }

          if (event === 'close' || event === 'error') {
            setConnected(false)
            if (cancelled) return
            setReconnecting(true)
            reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_MS)
          }
        },
      })
    }

    connect()

    return () => {
      cancelled = true
      controller.abort()
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [applyPeers, clientId, enabled, mapLayoutPatches, projectId, username])

  return {
    clientId,
    connected,
    reconnecting,
    peers,
    remoteSelections,
    publishSelection,
    publishLayout,
  }
}
