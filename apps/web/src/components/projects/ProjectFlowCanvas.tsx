import '@xyflow/react/dist/style.css'

import { Box, Button } from '@chakra-ui/react'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type EdgeChange,
  type IsValidConnection,
  type NodeMouseHandler,
  type OnConnect,
  type OnConnectEnd,
  type OnConnectStart,
  type OnNodeDrag,
} from '@xyflow/react'
import { Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useMotionEnabled, useMotionTransition } from '../../hooks/use-motion-props'
import { useAccentPalette, useColorMode } from '../../hooks/use-ui-config'
import { notifySuccess } from '../../lib/toast'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'
import { peerAccentColor } from '../../lib/api/project-collaboration'
import { ProjectAddNodePanel } from './ProjectAddNodePanel'
import { ProjectFlowCanvasActionBar } from './ProjectFlowCanvasActionBar'
import { ProjectFlowCanvasSplitter } from './ProjectFlowCanvasSplitter'
import { ProjectFlowCanvasToolbar, type FlowCanvasMenuId } from './ProjectFlowCanvasToolbar'
import { ProjectFlowConfigEdge } from './ProjectFlowConfigEdge'
import { ProjectFlowExplorerPanel } from './ProjectFlowExplorerPanel'
import { ProjectFlowMainEdge } from './ProjectFlowMainEdge'
import { ProjectFlowNode } from './ProjectFlowNode'
import { ProjectFlowRemoveNodeDialog } from './ProjectFlowRemoveNodeDialog'
import { ProjectFlowStickyNode } from './ProjectFlowStickyNode'
import { ProjectFlowStickyPortal } from './ProjectFlowStickyPortal'
import { ProjectNodeConfigPanel } from './ProjectNodeConfigPanel'
import { ProjectFlowActionsProvider } from './project-flow-actions-context'
import {
  applyFlowAutoLayout,
  restoreNodePositions,
  snapshotNodePositions,
} from './project-flow-auto-layout'
import {
  DEFAULT_FLOW_CANVAS_OPTIONS,
  type ProjectFlowCanvasOptions,
} from './project-flow-canvas-options'
import {
  MAIN_FLOW_HANDLES,
  configConnectionToEdge,
  hasMainOutgoing,
  isValidAnyConnection,
  isValidConfigConnection,
  isValidMainConnection,
  mainConnectionToEdge,
} from './project-flow-connect'
import { ProjectFlowConsoleProvider } from './project-flow-console-context'
import { insertMainNodeAfter, insertMainNodeBetween } from './project-flow-insert'
import type { ProjectCanvasNode, ProjectServiceEdge } from './project-flow-types'
import {
  preserveFlowNodeUiState,
  projectDetailToFlow,
  projectFlowLayoutSignature,
  projectFlowOptionsSignature,
  projectFlowStructureSignature,
} from './project-flow-utils'
import {
  createProjectNode,
  createStickyNote,
  duplicateProjectNode,
  isWorkflowNode,
} from './project-node-factory'
import type {
  AgentSlotIndex,
  ProjectNode,
  ProjectNodeKind,
  ProjectNodeStatus,
} from './project-sample-data'
import {
  useProjectRunMutation,
  useProjectRunQuery,
  useProjectRunStopMutation,
} from '../../hooks/queries/use-project-run-mutation'
import { buildFlowExecutionPlan } from './project-workflow-graph'
import { useFlowConsole } from './use-flow-console'
import { useProjectHistory } from './use-project-history'

const nodeTypes = { workflow: ProjectFlowNode, sticky: ProjectFlowStickyNode }
const edgeTypes = { workflow: ProjectFlowMainEdge, config: ProjectFlowConfigEdge }

function ProjectFlowCanvasInner() {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const colorMode = useColorMode()
  const { project, setProject, running, setRunning, collaboration } = useProjectWorkspace()
  const { pushHistory, undo: historyUndo, redo: historyRedo, canUndo, canRedo } = useProjectHistory(project, setProject)
  const flowConsole = useFlowConsole()
  const flowConsoleRef = useRef(flowConsole)
  useEffect(() => {
    flowConsoleRef.current = flowConsole
  })
  const { fitView, zoomIn, zoomOut } = useReactFlow()
  const motionEnabled = useMotionEnabled()

  const [focusedNode, setFocusedNode] = useState<ProjectNode | null>(null)
  const [configNode, setConfigNode] = useState<ProjectNode | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(project.nodes[0]?.id ?? null)
  const [canvasOptions, setCanvasOptions] = useState<ProjectFlowCanvasOptions>(
    DEFAULT_FLOW_CANVAS_OPTIONS,
  )
  const [openMenu, setOpenMenu] = useState<FlowCanvasMenuId>(null)
  const [insertAfterNodeId, setInsertAfterNodeId] = useState<string | null>(null)
  const [insertBetween, setInsertBetween] = useState<{
    sourceId: string
    targetId: string
  } | null>(null)
  const [insertConfigSlot, setInsertConfigSlot] = useState<{
    agentId: string
    slotIndex: AgentSlotIndex
  } | null>(null)
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([])
  const [runSuccessNodeIds, setRunSuccessNodeIds] = useState<string[]>([])
  const [explorerOpen, setExplorerOpen] = useState(true)
  const [runningStepIndex, setRunningStepIndex] = useState<number | null>(null)
  const [removeTarget, setRemoveTarget] = useState<ProjectNode | null>(null)
  const [stickyEditId, setStickyEditId] = useState<string | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  const runMutation = useProjectRunMutation(project.id)
  const stopMutation = useProjectRunStopMutation(project.id)
  const { data: activeRunData } = useProjectRunQuery(project.id, activeRunId)
  const panelTransition = useMotionTransition(0.28)
  const backdropTransition = useMotionTransition(0.22)
  const layoutBaselineRef = useRef(snapshotNodePositions(project))
  const layoutSyncGenRef = useRef(0)
  const flowSyncRef = useRef({ structure: '', options: '', layout: '', layoutGen: -1 })
  const layoutPublishTimerRef = useRef<number | null>(null)
  const pendingLayoutPatchRef = useRef<{ id: string; x: number; y: number } | null>(null)
  const runStepRef = useRef(0)
  const runFinishedRef = useRef(false)
  const runWasActiveRef = useRef(false)
  const lastLoggedStepRef = useRef<number | null>(null)
  const connectDragRef = useRef<{ nodeId: string; x: number; y: number } | null>(null)

  const configOpen = Boolean(configNode)
  const sidePanelOpen = configOpen || addOpen

  useEffect(() => {
    layoutBaselineRef.current = snapshotNodePositions(project)
  }, [project.id])

  useEffect(() => {
    const focusedNodeId = configNode?.id ?? activeNodeId ?? null
    collaboration.publishSelection(focusedNodeId)
  }, [activeNodeId, configNode?.id, collaboration.publishSelection])

  const completedSet = useMemo(() => new Set(completedNodeIds), [completedNodeIds])
  const runSuccessSet = useMemo(() => new Set(runSuccessNodeIds), [runSuccessNodeIds])
  const displayCompletedSet = useMemo(() => {
    if (running && completedSet.size > 0) return completedSet
    if (!running && runSuccessSet.size > 0) return runSuccessSet
    return undefined
  }, [running, completedSet, runSuccessSet])
  const runSucceeded = !running && runSuccessSet.size > 0

  const remotePeerHighlights = useMemo(() => {
    const map: Record<string, { username: string; color: string }[]> = {}
    for (const peer of collaboration.peers) {
      if (peer.clientId === collaboration.clientId) continue
      const nodeId = collaboration.remoteSelections[peer.clientId] ?? peer.selectedNodeId
      if (!nodeId) continue
      const entry = { username: peer.username, color: peerAccentColor(peer.clientId) }
      const list = map[nodeId] ?? []
      list.push(entry)
      map[nodeId] = list
    }
    return map
  }, [collaboration.clientId, collaboration.peers, collaboration.remoteSelections])

  const flowOptions = useMemo(
    () => ({
      runningNodeId: running ? activeNodeId : null,
      completedNodeIds: displayCompletedSet,
      runSucceeded,
      canvas: canvasOptions,
      showVariableRefs: canvasOptions.showVariableRefs,
      stickyEditId,
      remotePeerHighlights,
    }),
    [
      running,
      activeNodeId,
      displayCompletedSet,
      runSucceeded,
      canvasOptions,
      stickyEditId,
      remotePeerHighlights,
    ],
  )

  const initial = useMemo(() => projectDetailToFlow(project, flowOptions), [project, flowOptions])

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)

  useEffect(() => {
    const structure = projectFlowStructureSignature(project)
    const layout = projectFlowLayoutSignature(project)
    const options = projectFlowOptionsSignature(flowOptions)
    const layoutGen = layoutSyncGenRef.current
    const prev = flowSyncRef.current

    if (
      prev.structure === structure &&
      prev.options === options &&
      prev.layout === layout &&
      prev.layoutGen === layoutGen
    ) {
      return
    }

    flowSyncRef.current = { structure, options, layout, layoutGen }
    const next = projectDetailToFlow(project, flowOptions)
    setNodes((current) => preserveFlowNodeUiState(current, next.nodes))
    setEdges(next.edges)
  }, [project, flowOptions, setNodes, setEdges])

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      fitView({
        padding: sidePanelOpen ? { top: 0.12, right: 0.38, bottom: 0.12, left: 0.08 } : 0.4,
        maxZoom: 1,
        duration: motionEnabled ? 280 : 0,
      })
    })
    return () => window.cancelAnimationFrame(id)
  }, [sidePanelOpen, fitView, motionEnabled, nodes.length])

  const runPlanRef = useRef<ReturnType<typeof buildFlowExecutionPlan>>([])

  // When running stops (user cancel, no active run), clean up UI
  useEffect(() => {
    if (!running) {
      if (runWasActiveRef.current && !runFinishedRef.current) {
        flowConsoleRef.current.appendLine(t('projects.flowConsole.runStopped'), 'warn')
        setRunSuccessNodeIds([])
      }
      runWasActiveRef.current = false
      runFinishedRef.current = false
      lastLoggedStepRef.current = null
      runStepRef.current = 0
      runPlanRef.current = []
      const frame = window.requestAnimationFrame(() => {
        setCompletedNodeIds([])
        setRunningStepIndex(null)
      })
      return () => window.cancelAnimationFrame(frame)
    }
  }, [running, t])

  // Sync real run data from API poll into canvas state
  useEffect(() => {
    if (!activeRunData || !running) return

    const { steps, status } = activeRunData
    const TERMINAL = ['completed', 'failed', 'stopped']

    // Derive completed and currently-running node IDs from step results
    const successIds = steps
      .filter((s) => s.status === 'success' && s.phase === 'main')
      .map((s) => s.node_id)
    const failedIds = steps
      .filter((s) => s.status === 'failed' && s.phase === 'main')
      .map((s) => s.node_id)
    const runningStep = steps.find((s) => s.status === 'running' && s.phase === 'main')

    setCompletedNodeIds([...successIds, ...failedIds])
    setRunningStepIndex(runningStep ? 1 : null)
    if (runningStep) setActiveNodeId(runningStep.node_id)

    // Append newly-finished step output to console
    for (const step of steps) {
      const key = `${step.node_id}-${step.phase}`
      if (
        (step.status === 'success' || step.status === 'failed') &&
        lastLoggedStepRef.current !== (key as unknown as number)
      ) {
        lastLoggedStepRef.current = key as unknown as number
        const level = step.status === 'success' ? 'success' : 'error'
        const msg = step.output || step.error || step.node_label
        flowConsoleRef.current.appendLine(
          `${step.status === 'success' ? '✓' : '✗'} ${step.node_label}: ${msg}`,
          level,
          step.node_id,
          step.node_label,
        )
      }
    }

    if (TERMINAL.includes(status)) {
      runFinishedRef.current = true
      const stepCount = steps.filter((s) => s.phase === 'main').length
      if (status === 'completed') {
        setRunSuccessNodeIds(successIds)
        flowConsoleRef.current.appendLine(
          t('projects.flowConsole.runComplete', { count: String(stepCount) }),
          'success',
        )
      } else {
        flowConsoleRef.current.appendLine(
          status === 'stopped'
            ? t('projects.flowConsole.runStopped')
            : `Flow run failed (${activeRunData.error ?? 'unknown error'})`,
          'warn',
        )
      }
      setRunning(false)
      setActiveRunId(null)
    }
  }, [activeRunData, running, t, setRunning])

  const onNodeClick: NodeMouseHandler = useCallback((_event, flowNode) => {
    const data = flowNode.data as { node?: ProjectNode } | undefined
    if (!data?.node) return
    setAddOpen(false)
    setConfigNode(null)
    setActiveNodeId(flowNode.id)
    setFocusedNode(data.node)
  }, [])

  const closeConfig = useCallback(() => {
    setConfigNode(null)
  }, [])

  const clearFocus = useCallback(() => {
    setFocusedNode(null)
  }, [])

  const closeAdd = useCallback(() => {
    setAddOpen(false)
    setInsertAfterNodeId(null)
    setInsertBetween(null)
    setInsertConfigSlot(null)
  }, [])

  const openAdd = useCallback(() => {
    clearFocus()
    closeConfig()
    setInsertAfterNodeId(null)
    setInsertBetween(null)
    setInsertConfigSlot(null)
    setAddOpen(true)
  }, [clearFocus, closeConfig])

  const addStickyNote = useCallback(() => {
    const note = createStickyNote(project.nodes, t('projects.sticky.defaultTitle'))
    pushHistory(project)
    setProject((prev) => ({
      ...prev,
      nodes: [...prev.nodes, note],
    }))
    setAddOpen(false)
    setConfigNode(null)
    setActiveNodeId(note.id)
    setFocusedNode(note)
    notifySuccess(t('projects.sticky.added'))
  }, [project, pushHistory, setProject, t])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 's' || !event.shiftKey || event.metaKey || event.ctrlKey) {
        return
      }
      const target = event.target as HTMLElement | null
      if (
        target?.closest('input, textarea, [contenteditable="true"], [role="dialog"]') ||
        addOpen ||
        configOpen
      ) {
        return
      }
      event.preventDefault()
      addStickyNote()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [addOpen, addStickyNote, configOpen])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod || event.key.toLowerCase() !== 'z') return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"], [role="dialog"]')) return
      event.preventDefault()
      if (event.shiftKey) {
        historyRedo()
      } else {
        historyUndo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [historyUndo, historyRedo])

  const openAddAfter = useCallback(
    (nodeId: string) => {
      closeConfig()
      setInsertAfterNodeId(nodeId)
      setInsertBetween(null)
      setInsertConfigSlot(null)
      setActiveNodeId(nodeId)
      setAddOpen(true)
    },
    [closeConfig],
  )

  const openAddBetween = useCallback(
    (sourceId: string, targetId: string) => {
      closeConfig()
      setInsertAfterNodeId(null)
      setInsertBetween({ sourceId, targetId })
      setInsertConfigSlot(null)
      setActiveNodeId(targetId)
      setAddOpen(true)
    },
    [closeConfig],
  )

  const openSlotAdd = useCallback(
    (agentId: string, slotIndex: AgentSlotIndex) => {
      closeConfig()
      setInsertAfterNodeId(null)
      setInsertBetween(null)
      setInsertConfigSlot({ agentId, slotIndex })
      setActiveNodeId(agentId)
      setAddOpen(true)
    },
    [closeConfig],
  )

  const removeEdge = useCallback(
    (edgeId: string) => {
      const removed = project.edges.find((e) => e.id === edgeId)
      if (!removed) return
      pushHistory(project)
      setProject((prev) => ({
        ...prev,
        edges: prev.edges.filter((e) => e.id !== edgeId),
      }))
      notifySuccess(t('projects.flow.edgeRemoved'))
    },
    [project, pushHistory, setProject, t],
  )

  const handleAddNode = useCallback(
    (kind: ProjectNodeKind) => {
      const label = t(`projects.nodes.${kind}`)

      // --- Slot add: create config node + wire it to agent slot ---
      if (insertConfigSlot) {
        const { agentId, slotIndex } = insertConfigSlot
        const agentNode = project.nodes.find((n) => n.id === agentId)
        if (agentNode) {
          const node = createProjectNode(kind, label, project.nodes)
          // Position below the agent, aligned to the slot
          const slotLeftFrac = [0.22, 0.5, 0.78][slotIndex] ?? 0.5
          const agentW = 260
          node.x = agentNode.x + slotLeftFrac * agentW - 40
          node.y = agentNode.y + 200
          const edge = {
            id: `e-cfg-${node.id}-${agentId}-s${slotIndex}`,
            from: node.id,
            to: agentId,
            kind: 'config' as const,
            slotIndex,
          }
          pushHistory(project)
          setProject((prev) => ({
            ...prev,
            nodes: [...prev.nodes, node],
            edges: [...prev.edges, edge],
            servicesTotal: prev.servicesTotal + 1,
            previewNodes: [...prev.previewNodes, node].slice(-3),
          }))
          setAddOpen(false)
          setInsertConfigSlot(null)
          setActiveNodeId(node.id)
          setFocusedNode(node)
          setConfigNode(null)
          notifySuccess(t('projects.flow.pluginLinked', { name: label }))
          return
        }
      }

      // --- Main-path insert between two linked steps ---
      if (insertBetween) {
        const inserted = insertMainNodeBetween(
          project,
          insertBetween.sourceId,
          insertBetween.targetId,
          kind,
          label,
        )
        if (inserted) {
          const { node, edges, removeEdgeId } = inserted
          pushHistory(project)
          setProject((prev) => ({
            ...prev,
            nodes: [...prev.nodes, node],
            edges: [...prev.edges.filter((e) => e.id !== removeEdgeId), ...edges],
            servicesTotal: prev.servicesTotal + 1,
            previewNodes: [...prev.previewNodes, node].slice(-3),
          }))
          setAddOpen(false)
          setInsertBetween(null)
          setActiveNodeId(node.id)
          setFocusedNode(node)
          setConfigNode(null)
          notifySuccess(t('projects.flow.stepLinked', { type: label }))
          return
        }
      }

      // --- Main-path insert after a node ---
      if (insertAfterNodeId) {
        const inserted = insertMainNodeAfter(project, insertAfterNodeId, kind, label)
        if (inserted) {
          const { node, edge } = inserted
          pushHistory(project)
          setProject((prev) => ({
            ...prev,
            nodes: [...prev.nodes, node],
            edges: [...prev.edges, edge],
            servicesTotal: prev.servicesTotal + 1,
            previewNodes: [...prev.previewNodes, node].slice(-3),
          }))
          setAddOpen(false)
          setInsertAfterNodeId(null)
          setActiveNodeId(node.id)
          setFocusedNode(node)
          setConfigNode(null)
          notifySuccess(t('projects.flow.stepLinked', { type: label }))
          return
        }
      }

      const node = createProjectNode(kind, label, project.nodes)
      pushHistory(project)
      setProject((prev) => ({
        ...prev,
        nodes: [...prev.nodes, node],
        servicesTotal: isWorkflowNode(node) ? prev.servicesTotal + 1 : prev.servicesTotal,
        previewNodes: [...prev.previewNodes, node].slice(-3),
      }))
      setAddOpen(false)
      setInsertAfterNodeId(null)
      setInsertBetween(null)
      setActiveNodeId(node.id)
      setFocusedNode(node)
      setConfigNode(null)
      notifySuccess(t('projects.addNode.added', { type: label }))
    },
    [insertAfterNodeId, insertBetween, insertConfigSlot, project, pushHistory, setProject, t],
  )

  const isValidConnection = useCallback<IsValidConnection<ProjectServiceEdge>>(
    (edge) => isValidAnyConnection(edge, project),
    [project],
  )

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (isValidMainConnection(connection, project)) {
        const edge = mainConnectionToEdge(connection)
        if (!edge) return
        const sourceNode = project.nodes.find((n) => n.id === edge.from)
        const targetNode = project.nodes.find((n) => n.id === edge.to)
        if (!sourceNode || !targetNode) return
        pushHistory(project)
        setProject((prev) => {
          if (prev.edges.some((e) => e.id === edge.id)) return prev
          return { ...prev, edges: [...prev.edges, edge] }
        })
        setActiveNodeId(edge.to)
        notifySuccess(
          t('projects.flow.connected', { from: sourceNode.label, to: targetNode.label }),
        )
        return
      }

      if (isValidConfigConnection(connection, project)) {
        const edge = configConnectionToEdge(connection)
        if (!edge) return
        const sourceNode = project.nodes.find((n) => n.id === edge.from)
        if (!sourceNode) return
        pushHistory(project)
        setProject((prev) => {
          if (prev.edges.some((e) => e.id === edge.id)) return prev
          return { ...prev, edges: [...prev.edges, edge] }
        })
        notifySuccess(t('projects.flow.pluginLinked', { name: sourceNode.label }))
      }
    },
    [project, pushHistory, setProject, t],
  )

  const onConnectStart: OnConnectStart = useCallback((event, { nodeId, handleId }) => {
    if (handleId !== MAIN_FLOW_HANDLES.source || !nodeId) return
    const pointer = 'clientX' in event ? event : event.touches[0]
    connectDragRef.current = { nodeId, x: pointer.clientX, y: pointer.clientY }
  }, [])

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      const drag = connectDragRef.current
      connectDragRef.current = null

      if (!drag || connectionState.fromHandle?.id !== MAIN_FLOW_HANDLES.source) return
      if (connectionState.isValid === true) return

      const pointer = 'clientX' in event ? event : event.changedTouches[0]
      const moved = Math.hypot(pointer.clientX - drag.x, pointer.clientY - drag.y) > 8

      if (connectionState.toNode && moved) return

      const source = project.nodes.find((n) => n.id === drag.nodeId)
      if (!source || source.role === 'config') return
      if (hasMainOutgoing(project, drag.nodeId)) return

      openAddAfter(drag.nodeId)
    },
    [openAddAfter, project.nodes],
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes)

      const removedIds = changes
        .filter((change): change is EdgeChange & { type: 'remove' } => change.type === 'remove')
        .map((change) => change.id)

      if (removedIds.length === 0) return

      pushHistory(project)
      setProject((prev) => ({
        ...prev,
        edges: prev.edges.filter((edge) => !removedIds.includes(edge.id)),
      }))
    },
    [onEdgesChange, project, pushHistory, setProject],
  )

  const onPaneClick = useCallback(() => {
    setActiveNodeId(null)
    clearFocus()
    closeConfig()
    closeAdd()
    setOpenMenu(null)
  }, [clearFocus, closeConfig, closeAdd])

  const publishNodeLayout = useCallback(
    (nodeId: string, x: number, y: number, extra?: { noteWidth?: number; noteHeight?: number }) => {
      collaboration.publishLayout([
        {
          id: nodeId,
          x,
          y,
          ...(extra?.noteWidth !== undefined ? { noteWidth: extra.noteWidth } : {}),
          ...(extra?.noteHeight !== undefined ? { noteHeight: extra.noteHeight } : {}),
        },
      ])
    },
    [collaboration],
  )

  const queueLayoutPublish = useCallback(
    (nodeId: string, x: number, y: number) => {
      pendingLayoutPatchRef.current = { id: nodeId, x, y }
      if (layoutPublishTimerRef.current !== null) return
      layoutPublishTimerRef.current = window.setTimeout(() => {
        layoutPublishTimerRef.current = null
        const patch = pendingLayoutPatchRef.current
        pendingLayoutPatchRef.current = null
        if (!patch) return
        publishNodeLayout(patch.id, patch.x, patch.y)
      }, 50)
    },
    [publishNodeLayout],
  )

  useEffect(
    () => () => {
      if (layoutPublishTimerRef.current !== null) {
        window.clearTimeout(layoutPublishTimerRef.current)
      }
    },
    [],
  )

  const onNodeDrag: OnNodeDrag<ProjectCanvasNode> = useCallback(
    (_event, flowNode) => {
      queueLayoutPublish(flowNode.id, flowNode.position.x, flowNode.position.y)
    },
    [queueLayoutPublish],
  )

  const onNodeDragStop: OnNodeDrag<ProjectCanvasNode> = useCallback(
    (_event, flowNode) => {
      if (layoutPublishTimerRef.current !== null) {
        window.clearTimeout(layoutPublishTimerRef.current)
        layoutPublishTimerRef.current = null
      }
      pendingLayoutPatchRef.current = null
      publishNodeLayout(flowNode.id, flowNode.position.x, flowNode.position.y)
      pushHistory(project)
      setProject((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === flowNode.id ? { ...n, x: flowNode.position.x, y: flowNode.position.y } : n,
        ),
      }))
    },
    [project, publishNodeLayout, pushHistory, setProject],
  )

  const handleAutoLayout = useCallback(() => {
    layoutSyncGenRef.current += 1
    pushHistory(project)
    setProject((prev) => ({
      ...prev,
      nodes: applyFlowAutoLayout(prev),
    }))
    notifySuccess(t('projects.canvas.autoLayoutDone'))
    window.requestAnimationFrame(() => {
      fitView({ padding: 0.4, maxZoom: 1, duration: motionEnabled ? 280 : 0 })
    })
  }, [project, pushHistory, setProject, t, fitView, motionEnabled])

  const handleResetCanvas = useCallback(() => {
    layoutSyncGenRef.current += 1
    pushHistory(project)
    setProject((prev) => ({
      ...prev,
      nodes: restoreNodePositions(prev.nodes, layoutBaselineRef.current),
    }))
    notifySuccess(t('projects.canvas.resetDone'))
    window.requestAnimationFrame(() => {
      fitView({ padding: 0.4, maxZoom: 1, duration: motionEnabled ? 280 : 0 })
    })
  }, [project, pushHistory, setProject, t, fitView, motionEnabled])

  const handleFitView = useCallback(() => {
    fitView({
      padding: sidePanelOpen ? { top: 0.12, right: 0.38, bottom: 0.12, left: 0.08 } : 0.4,
      maxZoom: 1,
      duration: motionEnabled ? 280 : 0,
    })
  }, [fitView, sidePanelOpen, motionEnabled])

  const handleFocusNode = useCallback(
    (nodeId: string) => {
      setActiveNodeId(nodeId)
      const node = project.nodes.find((n) => n.id === nodeId)
      if (node) {
        setAddOpen(false)
        setConfigNode(null)
        setFocusedNode(node)
      }
      void fitView({
        nodes: [{ id: nodeId }],
        padding: 0.85,
        duration: motionEnabled ? 280 : 0,
        maxZoom: 1,
      })
    },
    [project.nodes, fitView, motionEnabled],
  )

  const performRemoveNode = useCallback(
    (nodeId: string) => {
      const removed = project.nodes.find((n) => n.id === nodeId)
      pushHistory(project)
      setProject((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== nodeId),
        edges: prev.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
        servicesTotal:
          removed && isWorkflowNode(removed)
            ? Math.max(0, prev.servicesTotal - 1)
            : prev.servicesTotal,
        previewNodes: prev.previewNodes.filter((n) => n.id !== nodeId),
      }))
      if (focusedNode?.id === nodeId) {
        clearFocus()
      }
      if (configNode?.id === nodeId) {
        closeConfig()
      }
      setActiveNodeId((current) => (current === nodeId ? null : current))
      if (removed) {
        notifySuccess(t('projects.nodeMenu.removed', { name: removed.label }))
      }
    },
    [project, pushHistory, focusedNode?.id, configNode?.id, setProject, clearFocus, closeConfig, t],
  )

  const flowActions = useMemo(
    () => ({
      openNodeConfig: (nodeId: string) => {
        const node = project.nodes.find((n) => n.id === nodeId)
        if (!node) return
        setAddOpen(false)
        setActiveNodeId(nodeId)
        setFocusedNode(node)
        setConfigNode(node)
      },
      duplicateNode: (nodeId: string) => {
        const source = project.nodes.find((n) => n.id === nodeId)
        if (!source) return
        const copy = duplicateProjectNode(source)
        pushHistory(project)
        setProject((prev) => ({
          ...prev,
          nodes: [...prev.nodes, copy],
          servicesTotal: prev.servicesTotal + 1,
          previewNodes: [...prev.previewNodes, copy].slice(-3),
        }))
        setActiveNodeId(copy.id)
        setFocusedNode(copy)
        setConfigNode(null)
        notifySuccess(t('projects.nodeMenu.duplicated', { name: source.label }))
      },
      removeNode: (nodeId: string) => {
        const node = project.nodes.find((n) => n.id === nodeId)
        if (!node) return
        setRemoveTarget(node)
      },
      openAddAfter,
      openAddBetween,
      openSlotAdd,
      removeEdge,
      executeStep: (nodeId: string) => {
        const node = project.nodes.find((n) => n.id === nodeId)
        if (!node) return
        setActiveNodeId(nodeId)
        flowConsoleRef.current.expandConsole()
        flowConsoleRef.current.setFilterNodeId(null)
        flowConsoleRef.current.appendLine(
          t('projects.flowConsole.stepStart', { name: node.label }),
          'info',
          node.id,
          node.label,
        )
        void runMutation.mutateAsync({ node_id: nodeId }).then((res) => {
          setActiveRunId(res.run_id)
          setRunSuccessNodeIds([])
          setRunning(true)
          runWasActiveRef.current = true
          runFinishedRef.current = false
          flowConsoleRef.current.clearConsole()
          flowConsoleRef.current.expandConsole()
          flowConsoleRef.current.appendLine(
            t('projects.flowConsole.stepStart', { name: node.label }),
            'info',
            node.id,
            node.label,
          )
        }).catch(() => {
          flowConsoleRef.current.appendLine(
            `Failed to start step: ${node.label}`,
            'error',
            node.id,
            node.label,
          )
        })
      },
      runWorkflow: () => {
        if (running) return
        flowConsoleRef.current.clearConsole()
        flowConsoleRef.current.expandConsole()
        flowConsoleRef.current.setFilterNodeId(null)
        flowConsoleRef.current.appendLine(t('projects.flowConsole.runStarted'))
        const plan = buildFlowExecutionPlan(project)
        if (plan.length === 0) {
          flowConsoleRef.current.appendLine(t('projects.flowConsole.runEmpty'), 'warn')
          return
        }
        void runMutation.mutateAsync({}).then((res) => {
          setActiveRunId(res.run_id)
          setRunSuccessNodeIds([])
          setRunning(true)
          runWasActiveRef.current = true
          runFinishedRef.current = false
          // Show first step as active immediately
          if (plan[0]) setActiveNodeId(plan[0].nodeId)
        }).catch(() => {
          flowConsoleRef.current.appendLine('Failed to start flow run', 'error')
        })
      },
      stopWorkflow: () => {
        if (activeRunId) {
          void stopMutation.mutateAsync(activeRunId).catch(() => {})
        }
        setRunning(false)
        setActiveRunId(null)
      },
      toggleNodeActive: (nodeId: string) => {
        pushHistory(project)
        setProject((prev) => {
          const target = prev.nodes.find((n) => n.id === nodeId)
          if (!target || target.status === undefined) return prev
          const nextStatus: ProjectNodeStatus = target.status === 'offline' ? 'online' : 'offline'
          const nodes = prev.nodes.map((n) => (n.id === nodeId ? { ...n, status: nextStatus } : n))
          const services = nodes.filter(
            (n) => n.role !== 'config' && n.role !== 'trigger' && n.status !== undefined,
          )
          return {
            ...prev,
            nodes,
            servicesOnline: services.filter((n) => n.status === 'online').length,
            servicesTotal: services.length,
          }
        })
      },
      copyNode: (nodeId: string) => {
        const source = project.nodes.find((n) => n.id === nodeId)
        if (!source) return
        void navigator.clipboard.writeText(source.id).then(() => {
          notifySuccess(t('projects.nodeMenu.copied', { name: source.label }))
        })
      },
      tidyWorkflow: () => {
        handleAutoLayout()
      },
      selectAllNodes: () => {
        setNodes((nds) => nds.map((n) => ({ ...n, selected: true })))
      },
      clearSelection: () => {
        setActiveNodeId(null)
        clearFocus()
        closeConfig()
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
      },
      previewNodeAction: (action: string) => {
        const previewKeys: Record<string, string> = {
          rename: 'projects.nodeMenu.preview.rename',
          replace: 'projects.nodeMenu.preview.replace',
          deactivate: 'projects.nodeMenu.preview.deactivate',
          pin: 'projects.nodeMenu.preview.pin',
          subflow: 'projects.nodeMenu.preview.subflow',
        }
        const key = previewKeys[action]
        if (key) notifySuccess(t(key))
      },
      beginStickyEdit: (nodeId: string) => {
        setStickyEditId(nodeId)
        const node = project.nodes.find((n) => n.id === nodeId)
        if (node) {
          setFocusedNode(node)
          setActiveNodeId(nodeId)
        }
      },
      endStickyEdit: () => setStickyEditId(null),
      focusCanvasNode: (nodeId: string, options?: { openConfig?: boolean }) => {
        const node = project.nodes.find((n) => n.id === nodeId)
        if (!node) return
        setAddOpen(false)
        setActiveNodeId(nodeId)
        setFocusedNode(node)
        setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })))
        void fitView({
          nodes: [{ id: nodeId }],
          padding: sidePanelOpen ? { top: 0.12, right: 0.38, bottom: 0.12, left: 0.08 } : 0.35,
          duration: motionEnabled ? 280 : 0,
        })
        if (options?.openConfig) {
          setConfigNode(node)
        }
      },
    }),
    [
      project,
      pushHistory,
      setProject,
      setNodes,
      closeConfig,
      clearFocus,
      openAddAfter,
      openAddBetween,
      openSlotAdd,
      removeEdge,
      handleAutoLayout,
      fitView,
      motionEnabled,
      sidePanelOpen,
      running,
      runMutation,
      stopMutation,
      activeRunId,
      setRunning,
      t,
    ],
  )

  const liveConfigNode = useMemo(() => {
    if (!configNode) return null
    return project.nodes.find((n) => n.id === configNode.id) ?? configNode
  }, [configNode, project.nodes])

  return (
    <ProjectFlowActionsProvider value={flowActions}>
      <Box
        className="project-flow-workspace"
        data-side-panel-open={sidePanelOpen ? '' : undefined}
        data-run-succeeded={runSucceeded ? '' : undefined}
        position="relative"
        flex={1}
        minH={0}
        h="100%"
        w="100%"
        overflow="hidden"
        bg="bg.panel"
        display="flex"
        flexDirection="column"
      >
        <ProjectFlowCanvasSplitter
          canvas={
            <>
              <Box className="project-flow-canvas-host" position="absolute" inset={0}>
                <ReactFlow
                  className="project-flow-canvas"
                  style={{ width: '100%', height: '100%' }}
                  colorMode={colorMode}
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={handleEdgesChange}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  defaultEdgeOptions={{ type: 'workflow' }}
                  onNodeClick={onNodeClick}
                  onNodeDrag={onNodeDrag}
                  onNodeDragStop={onNodeDragStop}
                  onPaneClick={onPaneClick}
                  fitView
                  fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
                  minZoom={0.35}
                  maxZoom={1.5}
                  proOptions={{ hideAttribution: true }}
                  zIndexMode="manual"
                  elevateNodesOnSelect={false}
                  elevateEdgesOnSelect={false}
                  nodesConnectable
                  connectionMode={ConnectionMode.Strict}
                  isValidConnection={isValidConnection}
                  onConnect={onConnect}
                  onConnectStart={onConnectStart}
                  onConnectEnd={onConnectEnd}
                  connectOnClick={false}
                  connectionLineStyle={{
                    stroke: 'var(--project-flow-edge)',
                    strokeWidth: 1.5,
                    strokeDasharray: '6 4',
                  }}
                  elementsSelectable
                  panOnScroll
                  zoomOnScroll
                >
                  <ProjectFlowStickyPortal />
                  <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="var(--project-flow-dot)"
                  />
                  <MiniMap
                    className="project-flow-minimap"
                    pannable
                    zoomable
                    nodeColor="var(--project-flow-node-border)"
                    maskColor="color-mix(in srgb, var(--app-canvas) 72%, transparent)"
                  />
                </ReactFlow>
              </Box>

              <ProjectFlowCanvasToolbar
                openMenu={openMenu}
                options={canvasOptions}
                onOpenMenu={setOpenMenu}
                onOptionsChange={(patch) => setCanvasOptions((prev) => ({ ...prev, ...patch }))}
                onZoomIn={() => zoomIn({ duration: motionEnabled ? 200 : 0 })}
                onZoomOut={() => zoomOut({ duration: motionEnabled ? 200 : 0 })}
                onFitView={handleFitView}
                onAutoLayout={handleAutoLayout}
                onResetCanvas={handleResetCanvas}
                onAddStickyNote={addStickyNote}
                onUndo={historyUndo}
                onRedo={historyRedo}
                canUndo={canUndo}
                canRedo={canRedo}
                consoleOpen={flowConsole.open}
                consoleExpanded={flowConsole.expanded}
                consoleLineCount={flowConsole.lines.length}
                onToggleConsole={() => {
                  if (!flowConsole.open) {
                    flowConsole.expandConsole()
                    return
                  }
                  if (flowConsole.expanded) {
                    flowConsole.minimizeConsole()
                    return
                  }
                  flowConsole.expandConsole()
                }}
              />

              <ProjectFlowExplorerPanel
                project={project}
                open={explorerOpen}
                onToggle={() => setExplorerOpen((v) => !v)}
                onFocusNode={handleFocusNode}
                runningStepIndex={running ? runningStepIndex : null}
              />

              <Button
                className="project-flow-add-btn"
                position="absolute"
                top={4}
                right={4}
                zIndex={6}
                size="sm"
                colorPalette={accentPalette}
                shadow="md"
                onClick={openAdd}
              >
                <Plus size={16} />
                {t('projects.add')}
              </Button>

              <ProjectFlowCanvasActionBar
                selectedNode={focusedNode}
                running={running}
                onDismiss={clearFocus}
              />
            </>
          }
        />

        <AnimatePresence>
          {sidePanelOpen ? (
            <motion.button
              key="side-backdrop"
              type="button"
              className="project-flow-config-backdrop"
              aria-label={t('projects.config.closeBackdrop')}
              initial={motionEnabled ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              exit={motionEnabled ? { opacity: 0 } : undefined}
              transition={backdropTransition}
              onClick={() => {
                clearFocus()
                closeConfig()
                closeAdd()
              }}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {addOpen ? (
            <motion.div
              key="add-node"
              className="project-flow-side-overlay"
              initial={motionEnabled ? { x: '100%' } : false}
              animate={{ x: 0 }}
              exit={motionEnabled ? { x: '100%' } : undefined}
              transition={panelTransition}
            >
              <ProjectAddNodePanel
                onClose={closeAdd}
                onPick={handleAddNode}
                pluginMode={Boolean(insertConfigSlot)}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {liveConfigNode && !addOpen ? (
            <motion.div
              key={liveConfigNode.id}
              className="project-flow-side-overlay"
              initial={motionEnabled ? { x: '100%' } : false}
              animate={{ x: 0 }}
              exit={motionEnabled ? { x: '100%' } : undefined}
              transition={panelTransition}
            >
              <ProjectNodeConfigPanel node={liveConfigNode} onClose={closeConfig} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Box>

      <ProjectFlowRemoveNodeDialog
        node={removeTarget}
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) return
          performRemoveNode(removeTarget.id)
          setRemoveTarget(null)
        }}
      />
    </ProjectFlowActionsProvider>
  )
}

export function ProjectFlowCanvas() {
  return (
    <ReactFlowProvider>
      <ProjectFlowConsoleProvider>
        <ProjectFlowCanvasInner />
      </ProjectFlowConsoleProvider>
    </ReactFlowProvider>
  )
}
