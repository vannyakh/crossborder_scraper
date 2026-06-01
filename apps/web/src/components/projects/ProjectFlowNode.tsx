import { Box, Text } from '@chakra-ui/react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { memo, useMemo, useState, type CSSProperties } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { ROLE_DEFAULTS, roleForKind } from './project-node-meta'
import type { ConfigInputPort } from './project-flow-layout'
import { ProjectFlowMainOutHandle } from './ProjectFlowMainOutHandle'
import { ProjectFlowNodeMenu } from './ProjectFlowNodeMenu'
import { ProjectFlowOutRail } from './ProjectFlowOutRail'
import { ProjectRemotePeerFocusBadge } from './ProjectRemotePeerFocusBadge'
import { ProjectFlowSubNodeToolbar } from './ProjectFlowSubNodeToolbar'
import { ProjectFlowTriggerRun } from './ProjectFlowTriggerRun'
import { ProjectWorkflowNode } from './ProjectWorkflowNode'
import type { ProjectFlowNodeData } from './project-flow-types'
import type { AgentSlotIndex, ProjectNodeRole } from './project-sample-data'
import { useNodeChromeVisible } from './use-node-chrome-visible'
import { useProjectFlowActions } from './project-flow-actions-context'

const HANDLE_CLASS = 'project-flow-handle'

// ---------------------------------------------------------------------------
// Agent bottom slot handles
// ---------------------------------------------------------------------------

function AgentSlotHandle({ port, agentId }: { port: ConfigInputPort; agentId: string }) {
  const { t } = useLocale()
  const actions = useProjectFlowActions()

  if (port.occupied) {
    return (
      <Handle
        key={port.handleId}
        type="target"
        position={Position.Bottom}
        id={port.handleId}
        className={`${HANDLE_CLASS} project-flow-handle--config project-flow-handle--network`}
        style={{ left: `${port.leftPercent}%` }}
        isConnectableEnd={false}
      />
    )
  }

  return (
    <Handle
      key={port.handleId}
      type="target"
      position={Position.Bottom}
      id={port.handleId}
      className={`${HANDLE_CLASS} project-flow-handle--slot-empty`}
      style={{ left: `${port.leftPercent}%` }}
      isConnectableEnd
      onClick={(e) => {
        e.stopPropagation()
        actions?.openSlotAdd(agentId, port.slotIndex as AgentSlotIndex)
      }}
      aria-label={t('projects.flow.addPlugin', {
        slot: port.labelKey ? t(port.labelKey) : port.label,
      })}
    />
  )
}

function AgentConfigHandles({
  ports,
  showLabels,
  agentId,
  inlineToolsStrip,
}: {
  ports: ConfigInputPort[]
  showLabels: boolean
  agentId: string
  inlineToolsStrip?: boolean
}) {
  const { t } = useLocale()

  return (
    <>
      {ports.map((port) => (
        <AgentSlotHandle key={port.handleId} port={port} agentId={agentId} />
      ))}
      {showLabels && !inlineToolsStrip ? (
        <Box className="project-workflow-node__port-labels" aria-hidden>
          {ports.map((port) => (
            <Text
              key={port.handleId}
              className={[
                'project-workflow-node__port-label',
                port.required ? 'project-workflow-node__port-label--required' : '',
                !port.occupied ? 'project-workflow-node__port-label--empty' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ left: `${port.leftPercent}%` }}
            >
              {port.occupied ? port.label : port.labelKey ? t(port.labelKey) : port.label}
              {port.required ? (
                <Text as="span" className="project-workflow-node__port-required">
                  {' *'}
                </Text>
              ) : null}
            </Text>
          ))}
        </Box>
      ) : null}
    </>
  )
}

// ---------------------------------------------------------------------------
// Handles for each node role
// ---------------------------------------------------------------------------

function handlesForRole(
  role: ProjectNodeRole,
  options: {
    configInputs?: ConfigInputPort[]
    showVariableRefs?: boolean
    showAddStep?: boolean
    hideMainOut?: boolean
    nodeId: string
    inlineToolsStrip?: boolean
  },
) {
  const {
    configInputs,
    showVariableRefs = true,
    showAddStep = false,
    hideMainOut = false,
    nodeId,
    inlineToolsStrip = false,
  } = options

  const mainOut = hideMainOut ? null : <ProjectFlowMainOutHandle showAddStep={showAddStep} />

  switch (role) {
    case 'trigger':
      return mainOut

    case 'config':
      // Config circles: source handle on top, draggable so user can wire to agent slots
      return (
        <Handle
          type="source"
          position={Position.Top}
          id="config-out"
          className={`${HANDLE_CLASS} project-flow-handle--config-src`}
          isConnectableStart
        />
      )

    case 'agent':
      return (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="main-in"
            className={`${HANDLE_CLASS} project-flow-handle--main-in`}
          />
          {mainOut}
          {configInputs?.length ? (
            <AgentConfigHandles
              ports={configInputs}
              showLabels={showVariableRefs}
              agentId={nodeId}
              inlineToolsStrip={inlineToolsStrip}
            />
          ) : null}
        </>
      )

    case 'action':
    default:
      return (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="main-in"
            className={`${HANDLE_CLASS} project-flow-handle--main-in`}
          />
          {mainOut}
        </>
      )
  }
}

// ---------------------------------------------------------------------------
// Node component
// ---------------------------------------------------------------------------

function ProjectFlowNodeComponent({
  id,
  data,
  selected,
}: NodeProps<Node<ProjectFlowNodeData, 'workflow'>>) {
  const role = roleForKind(data.node.kind, data.node.role)
  const isTrigger = role === 'trigger'
  const isAgent = role === 'agent'
  const isSubNode = role === 'config'

  // Agents always show 3 slot rows so the body height includes slot space
  const inlineToolsStrip = isAgent && Boolean(data.configInputs?.length)

  const outRailTopPx = useMemo(() => {
    // Rail anchors at the center of the node body (not including slot area below)
    return ROLE_DEFAULTS[role].h / 2
  }, [role])

  const [menuOpen, setMenuOpen] = useState(false)
  const { visible, nodeHoverHandlers, chromeHoverHandlers } = useNodeChromeVisible({
    selected: Boolean(selected),
    running: data.running,
    menuOpen,
  })

  const useOutRail = Boolean(data.showAddStep)
  const remotePeers = data.remotePeerHighlights ?? []
  const primaryRemotePeer = remotePeers[0]

  return (
    <Box
      className={[
        'project-flow-node-root',
        primaryRemotePeer ? 'project-flow-node-root--remote-peer' : '',
        useOutRail ? 'project-flow-node-root--has-out-rail' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        {
          '--node-body-w': `${ROLE_DEFAULTS[role].w}px`,
          ...(primaryRemotePeer
            ? { '--remote-peer-color': primaryRemotePeer.color }
            : undefined),
        } as CSSProperties
      }
    >
      {remotePeers.length > 0 ? <ProjectRemotePeerFocusBadge peers={remotePeers} /> : null}
      <ProjectFlowNodeMenu
        nodeId={id}
        node={data.node}
        visible={visible}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        chromeHoverHandlers={chromeHoverHandlers}
      />
      {isSubNode ? (
        <ProjectFlowSubNodeToolbar
          nodeId={id}
          node={data.node}
          visible={visible}
          menuOpen={menuOpen}
          onMenuOpenChange={setMenuOpen}
          chromeHoverHandlers={chromeHoverHandlers}
        />
      ) : null}
      {isTrigger ? (
        <ProjectFlowTriggerRun
          nodeId={id}
          visible={visible}
          chromeHoverHandlers={chromeHoverHandlers}
        />
      ) : null}
      <Box className="project-flow-node-body" {...nodeHoverHandlers}>
        <ProjectWorkflowNode
          node={data.node}
          selected={selected}
          running={data.running}
          executionStatus={data.executionStatus}
          configInputs={data.configInputs}
        />
      </Box>
      {useOutRail ? (
        <ProjectFlowOutRail anchorTopPx={outRailTopPx} showEntryLabel={isTrigger} />
      ) : null}
      {handlesForRole(role, {
        configInputs: data.configInputs,
        showVariableRefs: data.showVariableRefs !== false,
        showAddStep: data.showAddStep,
        hideMainOut: useOutRail,
        nodeId: id,
        inlineToolsStrip,
      })}
    </Box>
  )
}

export const ProjectFlowNode = memo(ProjectFlowNodeComponent)
