import { Box, Text } from '@chakra-ui/react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { memo, useState } from 'react'
import { roleForKind } from './project-node-meta'
import type { ConfigInputPort } from './project-flow-layout'
import { ProjectFlowNodeAddHandle } from './ProjectFlowNodeAddHandle'
import { ProjectFlowNodeMenu } from './ProjectFlowNodeMenu'
import { ProjectWorkflowNode } from './ProjectWorkflowNode'
import type { ProjectFlowNodeData } from './project-flow-types'
import type { ProjectNodeRole } from './project-sample-data'
import { useNodeChromeVisible } from './use-node-chrome-visible'

const HANDLE_CLASS = 'project-flow-handle'

function AgentConfigHandles({
  ports,
  showLabels,
}: {
  ports: ConfigInputPort[]
  showLabels: boolean
}) {
  return (
    <>
      {ports.map((port) => (
        <Handle
          key={port.handleId}
          type="target"
          position={Position.Bottom}
          id={port.handleId}
          className={`${HANDLE_CLASS} project-flow-handle--config`}
          style={{ left: `${port.leftPercent}%` }}
        />
      ))}
      {showLabels ? (
        <Box className="project-workflow-node__port-labels" aria-hidden>
          {ports.map((port) => (
            <Text
              key={port.handleId}
              className="project-workflow-node__port-label"
              style={{ left: `${port.leftPercent}%` }}
            >
              {port.label}
            </Text>
          ))}
        </Box>
      ) : null}
    </>
  )
}

function handlesForRole(
  role: ProjectNodeRole,
  configInputs?: ConfigInputPort[],
  showVariableRefs = true,
) {
  switch (role) {
    case 'trigger':
      return (
        <Handle type="source" position={Position.Right} id="main-out" className={HANDLE_CLASS} />
      )
    case 'config':
      return (
        <Handle type="source" position={Position.Top} id="config-out" className={HANDLE_CLASS} />
      )
    case 'agent':
      return (
        <>
          <Handle type="target" position={Position.Left} id="main-in" className={HANDLE_CLASS} />
          <Handle type="source" position={Position.Right} id="main-out" className={HANDLE_CLASS} />
          {configInputs?.length ? (
            <AgentConfigHandles ports={configInputs} showLabels={showVariableRefs} />
          ) : null}
        </>
      )
    case 'action':
    default:
      return (
        <>
          <Handle type="target" position={Position.Left} id="main-in" className={HANDLE_CLASS} />
          <Handle type="source" position={Position.Right} id="main-out" className={HANDLE_CLASS} />
        </>
      )
  }
}

function ProjectFlowNodeComponent({
  id,
  data,
  selected,
}: NodeProps<Node<ProjectFlowNodeData, 'workflow'>>) {
  const role = roleForKind(data.node.kind, data.node.role)
  const [menuOpen, setMenuOpen] = useState(false)
  const { visible, nodeHoverHandlers, chromeHoverHandlers } = useNodeChromeVisible({
    selected: Boolean(selected),
    running: data.running,
    menuOpen,
  })

  return (
    <Box className="project-flow-node-root" {...nodeHoverHandlers}>
      <ProjectFlowNodeMenu
        nodeId={id}
        node={data.node}
        visible={visible}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        chromeHoverHandlers={chromeHoverHandlers}
      />
      {data.showAddStep ? (
        <ProjectFlowNodeAddHandle
          nodeId={id}
          visible={visible}
          chromeHoverHandlers={chromeHoverHandlers}
        />
      ) : null}
      {handlesForRole(role, data.configInputs, data.showVariableRefs !== false)}
      <ProjectWorkflowNode
        node={data.node}
        selected={selected}
        running={data.running}
        executionStatus={data.executionStatus}
        configPortCount={data.configInputs?.length ?? 0}
      />
    </Box>
  )
}

export const ProjectFlowNode = memo(ProjectFlowNodeComponent)
