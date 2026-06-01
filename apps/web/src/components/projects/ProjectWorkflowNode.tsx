import { Box, Text } from '@chakra-ui/react'
import { AlertTriangle, Check } from 'lucide-react'
import { useLocale } from '../../hooks/use-locale'
import { ProjectAgentToolsStrip } from './ProjectAgentToolsStrip'
import { ProjectNodeIconTile } from './ProjectNodeIconTile'
import type { ConfigInputPort } from './project-flow-layout'
import type { FlowExecutionStatus } from './project-flow-types'
import { NODE_VISUAL, ROLE_DEFAULTS, roleForKind } from './project-node-meta'
import type { ProjectNode } from './project-sample-data'

const AGENT_TOOLS_H = 72

type ProjectWorkflowNodeProps = {
  node: ProjectNode
  selected?: boolean
  running?: boolean
  executionStatus?: FlowExecutionStatus
  configInputs?: ConfigInputPort[]
}

function ExecutionDoneBadge() {
  return (
    <Box className="project-workflow-node__exec-badge" aria-label="Completed" title="Completed">
      <Check size={14} strokeWidth={3} />
    </Box>
  )
}

function NodeStatusDot({ online, title }: { online: boolean; title: string }) {
  return (
    <Box
      className="project-workflow-node__status"
      data-online={online ? '' : undefined}
      title={title}
    />
  )
}

function NodeCaptionBelow({
  label,
  caption,
  deactivated,
}: {
  label: string
  caption?: string
  deactivated?: boolean
}) {
  return (
    <Box className="project-workflow-node__caption-below">
      <Text className="project-workflow-node__label" lineClamp={2} title={label}>
        {label}
        {deactivated ? (
          <Text as="span" className="project-workflow-node__deactivated">
            {' '}
            (Deactivated)
          </Text>
        ) : null}
      </Text>
      {caption ? (
        <Text className="project-workflow-node__subtitle" lineClamp={2} title={caption}>
          {caption}
        </Text>
      ) : null}
    </Box>
  )
}

export function ProjectWorkflowNode({
  node,
  selected,
  running,
  executionStatus = 'idle',
  configInputs,
}: ProjectWorkflowNodeProps) {
  const { t } = useLocale()
  const role = roleForKind(node.kind, node.role)
  const isConfig = role === 'config'
  const isAgent = role === 'agent'
  const isTrigger = role === 'trigger'
  const meta = NODE_VISUAL[node.kind]
  const Icon = meta.icon
  const baseSize = ROLE_DEFAULTS[role]
  const hasTools = isAgent && Boolean(configInputs?.length)
  const isCompact = role === 'action' || role === 'trigger'

  const cardH = hasTools ? baseSize.h + AGENT_TOOLS_H : baseSize.h

  const caption = node.subtitle ?? node.host ?? node.detail
  const online = node.status !== 'offline'
  const deactivated = node.status === 'offline'
  const statusTitle = online ? t('projects.serviceOnline') : t('projects.serviceOffline')
  const captionWidth = isCompact ? Math.max(baseSize.w, 120) : baseSize.w

  const isDone = executionStatus === 'done'
  const isRunning = running && !isDone

  const wrapClass = [
    'project-workflow-node-wrap',
    `project-workflow-node-wrap--${role}`,
    selected ? 'project-workflow-node-wrap--selected' : '',
    isRunning ? 'project-workflow-node-wrap--running' : '',
    isDone ? 'project-workflow-node-wrap--done' : '',
    hasTools ? 'project-workflow-node-wrap--has-tools' : '',
    deactivated ? 'project-workflow-node-wrap--deactivated' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const cardClass = [
    'project-workflow-node',
    `project-workflow-node--${role}`,
    selected ? 'project-workflow-node--selected' : '',
    isRunning ? 'project-workflow-node--running' : '',
    isDone ? 'project-workflow-node--done' : '',
    hasTools ? 'project-workflow-node--has-tools' : '',
    deactivated ? 'project-workflow-node--deactivated' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (isConfig) {
    return (
      <Box className={wrapClass} pb={0}>
        <Box className="project-workflow-node-config-card">
          <Box className={cardClass} w={`${baseSize.w}px`} h={`${baseSize.h}px`}>
            <ProjectNodeIconTile meta={meta} size="md" round="full">
              <Icon size={18} strokeWidth={1.75} />
            </ProjectNodeIconTile>
          </Box>
          {isDone ? <ExecutionDoneBadge /> : null}
        </Box>
        <Box className="project-workflow-node__caption-below" w={`${Math.max(baseSize.w, 120)}px`}>
          <NodeCaptionBelow label={node.label} caption={caption} />
        </Box>
      </Box>
    )
  }

  if (isAgent) {
    return (
      <Box className={wrapClass} pb="20px">
        <Box
          className={cardClass}
          w={`${baseSize.w}px`}
          h={`${cardH}px`}
          flexDirection="column"
          alignItems="stretch"
        >
          <Box
            className="project-workflow-node__body project-workflow-node__body--agent"
            h={`${baseSize.h}px`}
          >
            <ProjectNodeIconTile meta={meta} size="lg" round="md">
              <Icon size={22} strokeWidth={1.75} />
            </ProjectNodeIconTile>
            <Box className="project-workflow-node__agent-copy">
              <Text className="project-workflow-node__agent-title" lineClamp={1} title={node.label}>
                {node.label}
                {deactivated ? (
                  <Text as="span" className="project-workflow-node__deactivated">
                    {' '}
                    (Deactivated)
                  </Text>
                ) : null}
              </Text>
              {caption ? (
                <Text className="project-workflow-node__agent-sub" lineClamp={1} title={caption}>
                  {caption}
                </Text>
              ) : null}
            </Box>
            {node.status && !isDone ? <NodeStatusDot online={online} title={statusTitle} /> : null}
          </Box>

          {configInputs ? <ProjectAgentToolsStrip ports={configInputs} /> : null}
          {isDone ? <ExecutionDoneBadge /> : null}
        </Box>
      </Box>
    )
  }

  // Trigger + action — icon tile only; labels below the card (n8n-style)
  return (
    <Box className={wrapClass}>
      <Box className="project-workflow-node-compact-card">
        <Box className={cardClass} w={`${baseSize.w}px`} h={`${cardH}px`}>
          <Box
            className="project-workflow-node__body project-workflow-node__body--compact"
            flex={1}
            minH={0}
          >
            <ProjectNodeIconTile meta={meta} size="lg" round={isTrigger ? 'full' : 'md'}>
              <Icon size={isTrigger ? 26 : 28} strokeWidth={1.5} />
            </ProjectNodeIconTile>
            {deactivated ? (
              <Box className="project-workflow-node__warn" title={statusTitle} aria-hidden>
                <AlertTriangle size={12} strokeWidth={2.25} />
              </Box>
            ) : node.status && !isDone ? (
              <NodeStatusDot online={online} title={statusTitle} />
            ) : null}
          </Box>
        </Box>
        {isDone ? <ExecutionDoneBadge /> : null}
      </Box>
      <Box className="project-workflow-node__caption-below" w={`${captionWidth}px`}>
        <NodeCaptionBelow label={node.label} caption={caption} deactivated={deactivated} />
      </Box>
    </Box>
  )
}
