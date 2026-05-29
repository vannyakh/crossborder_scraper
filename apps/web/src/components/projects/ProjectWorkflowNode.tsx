import { Box, Text } from '@chakra-ui/react'
import { Zap } from 'lucide-react'
import { useLocale } from '../../hooks/use-locale'
import { NODE_VISUAL, ROLE_DEFAULTS, roleForKind } from './project-node-meta'
import type { FlowExecutionStatus } from './project-flow-types'
import type { ProjectNode } from './project-sample-data'

type ProjectWorkflowNodeProps = {
  node: ProjectNode
  selected?: boolean
  running?: boolean
  executionStatus?: FlowExecutionStatus
  configPortCount?: number
}

export function ProjectWorkflowNode({
  node,
  selected,
  running,
  executionStatus = 'idle',
  configPortCount = 0,
}: ProjectWorkflowNodeProps) {
  const { t } = useLocale()
  const role = roleForKind(node.kind, node.role)
  const isConfig = role === 'config'
  const isAgent = role === 'agent'
  const isTrigger = role === 'trigger'
  const meta = NODE_VISUAL[node.kind]
  const Icon = meta.icon
  const baseSize = ROLE_DEFAULTS[role]
  const size = isAgent && configPortCount > 0 ? { w: baseSize.w, h: baseSize.h + 22 } : baseSize
  const online = node.status !== 'offline'

  const caption = node.subtitle ?? node.host ?? node.detail

  return (
    <Box
      className={[
        'project-workflow-node-wrap',
        selected ? 'project-workflow-node-wrap--selected' : '',
        running ? 'project-workflow-node-wrap--running' : '',
        executionStatus === 'done' ? 'project-workflow-node-wrap--done' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      position="relative"
      pt={0}
      pb={isAgent ? '22px' : 0}
    >
      <Box
        className={[
          'project-workflow-node',
          `project-workflow-node--${role}`,
          selected ? 'project-workflow-node--selected' : '',
          running ? 'project-workflow-node--running' : '',
          executionStatus === 'done' ? 'project-workflow-node--done' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        w={`${size.w}px`}
        h={`${size.h}px`}
        position="relative"
      >
        {isTrigger ? (
          <Box className="project-workflow-node__badge" aria-hidden>
            <Zap size={12} strokeWidth={2.25} />
          </Box>
        ) : null}

        <Box
          className="project-workflow-node__icon"
          style={{
            background: isConfig || isAgent ? meta.iconBg : 'transparent',
            color: isConfig || isAgent ? meta.iconColor : meta.iconBg,
          }}
        >
          <Icon size={isAgent ? 22 : isConfig ? 18 : 30} strokeWidth={isConfig ? 1.75 : 1.6} />
        </Box>

        {isAgent ? (
          <Box className="project-workflow-node__agent-copy" px={3}>
            <Text className="project-workflow-node__agent-title" lineClamp={1}>
              {node.label}
            </Text>
            {caption ? (
              <Text className="project-workflow-node__agent-sub" lineClamp={1}>
                {caption}
              </Text>
            ) : null}
          </Box>
        ) : null}

        {node.status && !isConfig ? (
          <Box
            className="project-workflow-node__status"
            data-online={online ? '' : undefined}
            title={online ? t('projects.serviceOnline') : t('projects.serviceOffline')}
          />
        ) : null}
      </Box>

      {!isAgent ? (
        <Box className="project-workflow-node__description" w={`${Math.max(size.w, 160)}px`}>
          <Text className="project-workflow-node__label" lineClamp={2}>
            {node.label}
          </Text>
          {caption ? (
            <Text className="project-workflow-node__subtitle" lineClamp={1}>
              {caption}
            </Text>
          ) : null}
        </Box>
      ) : null}
    </Box>
  )
}
