import '@xyflow/react/dist/style.css'

import { Box, Button, HStack } from '@chakra-ui/react'
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type NodeMouseHandler,
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
import { ProjectAddNodePanel } from './ProjectAddNodePanel'
import { ProjectFlowCanvasToolbar, type FlowCanvasMenuId } from './ProjectFlowCanvasToolbar'
import { ProjectFlowConfigEdge } from './ProjectFlowConfigEdge'
import { ProjectFlowMainEdge } from './ProjectFlowMainEdge'
import { ProjectFlowNode } from './ProjectFlowNode'
import { ProjectNodeConfigPanel } from './ProjectNodeConfigPanel'
import {
  applyFlowAutoLayout,
  restoreNodePositions,
  snapshotNodePositions,
} from './project-flow-auto-layout'
import { ProjectFlowActionsProvider } from './project-flow-actions-context'
import {
  DEFAULT_FLOW_CANVAS_OPTIONS,
  type ProjectFlowCanvasOptions,
} from './project-flow-canvas-options'
import type { ProjectFlowNodeData, ProjectServiceNode } from './project-flow-types'
import { insertMainNodeAfter } from './project-flow-insert'
import { buildMainFlowSteps } from './project-flow-run'
import { projectDetailToFlow } from './project-flow-utils'
import { createProjectNode, duplicateProjectNode } from './project-node-factory'
import type { ProjectNode, ProjectNodeKind } from './project-sample-data'

const nodeTypes = { workflow: ProjectFlowNode }
const edgeTypes = { workflow: ProjectFlowMainEdge, config: ProjectFlowConfigEdge }

function ProjectFlowCanvasInner() {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const colorMode = useColorMode()
  const { project, setProject, running } = useProjectWorkspace()
  const { fitView, zoomIn, zoomOut } = useReactFlow()
  const motionEnabled = useMotionEnabled()
  const panelTransition = useMotionTransition(0.28)
  const backdropTransition = useMotionTransition(0.22)

  const [selectedNode, setSelectedNode] = useState<ProjectNode | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(project.nodes[0]?.id ?? null)
  const [canvasOptions, setCanvasOptions] = useState<ProjectFlowCanvasOptions>(
    DEFAULT_FLOW_CANVAS_OPTIONS,
  )
  const [openMenu, setOpenMenu] = useState<FlowCanvasMenuId>(null)
  const [insertAfterNodeId, setInsertAfterNodeId] = useState<string | null>(null)
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([])
  const layoutBaselineRef = useRef(snapshotNodePositions(project))
  const runStepRef = useRef(0)

  const configOpen = Boolean(selectedNode)
  const sidePanelOpen = configOpen || addOpen

  useEffect(() => {
    layoutBaselineRef.current = snapshotNodePositions(project)
  }, [project.id])

  const completedSet = useMemo(() => new Set(completedNodeIds), [completedNodeIds])

  const flowOptions = useMemo(
    () => ({
      runningNodeId: running ? activeNodeId : null,
      completedNodeIds: running ? completedSet : undefined,
      canvas: canvasOptions,
      showVariableRefs: canvasOptions.showVariableRefs,
    }),
    [running, activeNodeId, completedSet, canvasOptions],
  )

  const initial = useMemo(() => projectDetailToFlow(project, flowOptions), [project, flowOptions])

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)

  useEffect(() => {
    const next = projectDetailToFlow(project, flowOptions)
    setNodes(next.nodes)
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

  useEffect(() => {
    if (!running) {
      setCompletedNodeIds([])
      runStepRef.current = 0
      return
    }

    const steps = buildMainFlowSteps(project)
    if (steps.length === 0) return

    runStepRef.current = 0
    setCompletedNodeIds([])
    setActiveNodeId(steps[0])

    const timer = window.setInterval(() => {
      const index = runStepRef.current
      if (index >= steps.length) {
        window.clearInterval(timer)
        return
      }

      setCompletedNodeIds(steps.slice(0, index + 1))
      const nextIndex = index + 1
      runStepRef.current = nextIndex

      if (nextIndex < steps.length) {
        setActiveNodeId(steps[nextIndex])
      } else {
        window.clearInterval(timer)
      }
    }, 900)

    return () => window.clearInterval(timer)
  }, [running, project])

  const onNodeClick: NodeMouseHandler = useCallback((_event, flowNode) => {
    const data = flowNode.data as ProjectFlowNodeData | undefined
    if (!data?.node) return
    setAddOpen(false)
    setActiveNodeId(flowNode.id)
    setSelectedNode(data.node)
  }, [])

  const closeConfig = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const closeAdd = useCallback(() => {
    setAddOpen(false)
    setInsertAfterNodeId(null)
  }, [])

  const openAdd = useCallback(() => {
    closeConfig()
    setInsertAfterNodeId(null)
    setAddOpen(true)
  }, [closeConfig])

  const openAddAfter = useCallback(
    (nodeId: string) => {
      closeConfig()
      setInsertAfterNodeId(nodeId)
      setActiveNodeId(nodeId)
      setAddOpen(true)
    },
    [closeConfig],
  )

  const handleAddNode = useCallback(
    (kind: ProjectNodeKind) => {
      const label = t(`projects.nodes.${kind}`)

      if (insertAfterNodeId) {
        const inserted = insertMainNodeAfter(project, insertAfterNodeId, kind, label)
        if (inserted) {
          const { node, edge } = inserted
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
          setSelectedNode(node)
          notifySuccess(t('projects.flow.stepLinked', { type: label }))
          return
        }
      }

      const node = createProjectNode(kind, label, project.nodes)
      setProject((prev) => ({
        ...prev,
        nodes: [...prev.nodes, node],
        servicesTotal: prev.servicesTotal + 1,
        previewNodes: [...prev.previewNodes, node].slice(-3),
      }))
      setAddOpen(false)
      setInsertAfterNodeId(null)
      setActiveNodeId(node.id)
      setSelectedNode(node)
      notifySuccess(t('projects.addNode.added', { type: label }))
    },
    [insertAfterNodeId, project, setProject, t],
  )

  const onPaneClick = useCallback(() => {
    setActiveNodeId(null)
    closeConfig()
    closeAdd()
    setOpenMenu(null)
  }, [closeConfig, closeAdd])

  const onNodeDragStop: OnNodeDrag<ProjectServiceNode> = useCallback(
    (_event, flowNode) => {
      setProject((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === flowNode.id ? { ...n, x: flowNode.position.x, y: flowNode.position.y } : n,
        ),
      }))
    },
    [setProject],
  )

  const handleAutoLayout = useCallback(() => {
    setProject((prev) => ({
      ...prev,
      nodes: applyFlowAutoLayout(prev),
    }))
    notifySuccess(t('projects.canvas.autoLayoutDone'))
    window.requestAnimationFrame(() => {
      fitView({ padding: 0.4, maxZoom: 1, duration: motionEnabled ? 280 : 0 })
    })
  }, [setProject, t, fitView, motionEnabled])

  const handleResetCanvas = useCallback(() => {
    setProject((prev) => ({
      ...prev,
      nodes: restoreNodePositions(prev.nodes, layoutBaselineRef.current),
    }))
    notifySuccess(t('projects.canvas.resetDone'))
    window.requestAnimationFrame(() => {
      fitView({ padding: 0.4, maxZoom: 1, duration: motionEnabled ? 280 : 0 })
    })
  }, [setProject, t, fitView, motionEnabled])

  const handleFitView = useCallback(() => {
    fitView({
      padding: sidePanelOpen ? { top: 0.12, right: 0.38, bottom: 0.12, left: 0.08 } : 0.4,
      maxZoom: 1,
      duration: motionEnabled ? 280 : 0,
    })
  }, [fitView, sidePanelOpen, motionEnabled])

  const flowActions = useMemo(
    () => ({
      openNodeConfig: (nodeId: string) => {
        const node = project.nodes.find((n) => n.id === nodeId)
        if (!node) return
        setAddOpen(false)
        setActiveNodeId(nodeId)
        setSelectedNode(node)
      },
      duplicateNode: (nodeId: string) => {
        const source = project.nodes.find((n) => n.id === nodeId)
        if (!source) return
        const copy = duplicateProjectNode(source)
        setProject((prev) => ({
          ...prev,
          nodes: [...prev.nodes, copy],
          servicesTotal: prev.servicesTotal + 1,
          previewNodes: [...prev.previewNodes, copy].slice(-3),
        }))
        setActiveNodeId(copy.id)
        setSelectedNode(copy)
        notifySuccess(t('projects.nodeMenu.duplicated', { name: source.label }))
      },
      removeNode: (nodeId: string) => {
        const removed = project.nodes.find((n) => n.id === nodeId)
        setProject((prev) => ({
          ...prev,
          nodes: prev.nodes.filter((n) => n.id !== nodeId),
          edges: prev.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
          servicesTotal: Math.max(0, prev.servicesTotal - 1),
          previewNodes: prev.previewNodes.filter((n) => n.id !== nodeId),
        }))
        if (selectedNode?.id === nodeId) {
          closeConfig()
        }
        setActiveNodeId((current) => (current === nodeId ? null : current))
        if (removed) {
          notifySuccess(t('projects.nodeMenu.removed', { name: removed.label }))
        }
      },
      openAddAfter,
      executeStep: (nodeId: string) => {
        setActiveNodeId(nodeId)
        notifySuccess(t('projects.nodeMenu.executePreview'))
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
    }),
    [
      project.nodes,
      selectedNode?.id,
      setProject,
      setNodes,
      closeConfig,
      openAddAfter,
      handleAutoLayout,
      t,
    ],
  )

  return (
    <ProjectFlowActionsProvider value={flowActions}>
      <Box
        className="project-flow-workspace"
        data-side-panel-open={sidePanelOpen ? '' : undefined}
        position="relative"
        flex={1}
        minH={0}
        h="100%"
        w="100%"
        overflow="hidden"
        bg="bg.panel"
      >
        <Box className="project-flow-canvas-stage" position="absolute" inset={0}>
          <Box className="project-flow-canvas-host" position="absolute" inset={0}>
            <ReactFlow
              className="project-flow-canvas"
              style={{ width: '100%', height: '100%' }}
              colorMode={colorMode}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: 'workflow' }}
              onNodeClick={onNodeClick}
              onNodeDragStop={onNodeDragStop}
              onPaneClick={onPaneClick}
              fitView
              fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
              minZoom={0.35}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
              nodesConnectable={false}
              elementsSelectable
              panOnScroll
              zoomOnScroll
            >
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

          {running ? (
            <Box
              position="absolute"
              top={4}
              left="50%"
              transform="translateX(-50%)"
              zIndex={6}
              px={3}
              py={1}
              borderRadius="full"
              bg="green.subtle"
              borderWidth="1px"
              borderColor="green.muted"
            >
              <HStack gap={2} fontSize="xs" color="green.200">
                <Box w="6px" h="6px" borderRadius="full" bg="green.400" className="pulse" />
                {t('projects.flowRunning')}
              </HStack>
            </Box>
          ) : null}

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
                <ProjectAddNodePanel onClose={closeAdd} onPick={handleAddNode} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {selectedNode && !addOpen ? (
              <motion.div
                key={selectedNode.id}
                className="project-flow-side-overlay"
                initial={motionEnabled ? { x: '100%' } : false}
                animate={{ x: 0 }}
                exit={motionEnabled ? { x: '100%' } : undefined}
                transition={panelTransition}
              >
                <ProjectNodeConfigPanel node={selectedNode} onClose={closeConfig} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Box>
      </Box>
    </ProjectFlowActionsProvider>
  )
}

export function ProjectFlowCanvas() {
  return (
    <ReactFlowProvider>
      <ProjectFlowCanvasInner />
    </ReactFlowProvider>
  )
}
