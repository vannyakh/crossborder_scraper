import { Box, Text } from '@chakra-ui/react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { memo, useMemo, useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { ROLE_DEFAULTS, roleForKind } from './project-node-meta'
import type { ConfigInputPort } from './project-flow-layout'
import { ProjectFlowMainOutHandle } from './ProjectFlowMainOutHandle'
import { ProjectFlowNodeMenu } from './ProjectFlowNodeMenu'
import { ProjectFlowOutRail } from './ProjectFlowOutRail'
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
      aria-label={t('projects.flow.addPlugin', { slot: port.label })}
    />
  )
}

function AgentConfigHandles({
  ports,
  showLabels,
  agentId,
}: {
  ports: ConfigInputPort[]
  showLabels: boolean
  agentId: string
}) {
  return (
    <>
      {ports.map((port) => (
        <AgentSlotHandle key={port.handleId} port={port} agentId={agentId} />
      ))}
      {showLabels ? (
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
              {port.label}
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
  },
) {
  const {
    configInputs,
    showVariableRefs = true,
    showAddStep = false,
    hideMainOut = false,
    nodeId,
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

  // Agents always show 3 slot rows so the body height includes slot space
  const configPortCount = isAgent ? (data.configInputs?.length ?? 3) : 0

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

  return (
    <Box
      className={[
        'project-flow-node-root',
        useOutRail ? 'project-flow-node-root--has-out-rail' : '',
        useOutRail && isTrigger ? 'project-flow-node-root--flow-entry' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...nodeHoverHandlers}
    >
      <ProjectFlowNodeMenu
        nodeId={id}
        node={data.node}
        visible={visible}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        chromeHoverHandlers={chromeHoverHandlers}
      />
      <ProjectWorkflowNode
        node={data.node}
        selected={selected}
        running={data.running}
        executionStatus={data.executionStatus}
        configPortCount={configPortCount}
      />
      {useOutRail ? (
        <ProjectFlowOutRail anchorTopPx={outRailTopPx} showEntryLabel={isTrigger} />
      ) : null}
      {handlesForRole(role, {
        configInputs: data.configInputs,
        showVariableRefs: data.showVariableRefs !== false,
        showAddStep: data.showAddStep,
        hideMainOut: useOutRail,
        nodeId: id,
      })}
    </Box>
  )
}

export const ProjectFlowNode = memo(ProjectFlowNodeComponent)
