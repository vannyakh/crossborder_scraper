import { Badge, Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { AlertCircle, ChevronDown, ChevronUp, ListTree } from 'lucide-react'
import { useMemo } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { roleForKind } from './project-node-meta'
import {
  createWorkflowGraph,
  type FlowExecutionStep,
  type WorkflowIssue,
} from './project-workflow-graph'
import type { ProjectDetail } from './project-sample-data'

export function ProjectFlowExplorerPanel({
  project,
  open,
  onToggle,
  onFocusNode,
  runningStepIndex,
}: {
  project: ProjectDetail
  open: boolean
  onToggle: () => void
  onFocusNode: (nodeId: string) => void
  runningStepIndex?: number | null
}) {
  const { t } = useLocale()

  const graph = useMemo(() => createWorkflowGraph(project), [project])
  const summary = useMemo(() => graph.getSummary(), [graph])
  const plan = useMemo(() => graph.getExecutionPlan(), [graph])
  const issues = useMemo(() => graph.validate(), [graph])

  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warnCount = issues.filter((i) => i.severity === 'warning').length

  return (
    <Box
      className={['project-flow-explorer', open ? 'project-flow-explorer--open' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <Button
        className="project-flow-explorer__toggle"
        size="sm"
        variant="outline"
        borderColor="border.subtle"
        bg="bg.elevated"
        onClick={onToggle}
        aria-expanded={open}
      >
        <ListTree size={14} />
        {t('projects.flowExplorer.title')}
        {issues.length > 0 ? (
          <Badge size="sm" colorPalette={errorCount > 0 ? 'red' : 'orange'} variant="subtle">
            {errorCount + warnCount}
          </Badge>
        ) : null}
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </Button>

      {open ? (
        <Box className="project-flow-explorer__body">
          <HStack className="project-flow-explorer__stats" gap={2} flexWrap="wrap" mb={3}>
            <StatChip
              label={t('projects.flowExplorer.statNodes')}
              value={String(summary.nodeCount)}
            />
            <StatChip
              label={t('projects.flowExplorer.statMain')}
              value={String(summary.mainEdgeCount)}
            />
            <StatChip
              label={t('projects.flowExplorer.statConfig')}
              value={String(summary.configEdgeCount)}
            />
            <StatChip
              label={t('projects.flowExplorer.statTriggers')}
              value={String(summary.triggerCount)}
            />
            <StatChip
              label={t('projects.flowExplorer.statAgents')}
              value={String(summary.agentCount)}
            />
          </HStack>

          {issues.length > 0 ? (
            <Box mb={3}>
              <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={1.5}>
                {t('projects.flowExplorer.validation')}
              </Text>
              <VStack align="stretch" gap={1}>
                {issues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} onFocusNode={onFocusNode} />
                ))}
              </VStack>
            </Box>
          ) : (
            <HStack gap={2} mb={3} fontSize="xs" color="green.300">
              <AlertCircle size={14} />
              {t('projects.flowExplorer.valid')}
            </HStack>
          )}

          <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={1.5}>
            {t('projects.flowExplorer.executionOrder')}
          </Text>
          <VStack
            className="project-flow-explorer__steps app-scroll"
            align="stretch"
            gap={0}
            maxH="160px"
            overflowY="auto"
          >
            {plan.length === 0 ? (
              <Text fontSize="xs" color="fg.subtle" py={2}>
                {t('projects.flowExplorer.noSteps')}
              </Text>
            ) : (
              plan.map((step, index) => (
                <ExecutionStepRow
                  key={`${step.nodeId}-${step.phase}-${index}`}
                  step={step}
                  index={index}
                  project={project}
                  active={runningStepIndex === index}
                  done={runningStepIndex != null && index < runningStepIndex}
                  onFocus={() => onFocusNode(step.nodeId)}
                />
              ))
            )}
          </VStack>
        </Box>
      ) : null}
    </Box>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <Box
      px={2}
      py={1}
      borderRadius="var(--radius-input)"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.panel"
      minW={0}
    >
      <Text fontSize="2xs" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="semibold">
        {value}
      </Text>
    </Box>
  )
}

function IssueRow({
  issue,
  onFocusNode,
}: {
  issue: WorkflowIssue
  onFocusNode: (nodeId: string) => void
}) {
  const { t } = useLocale()
  const params = { ...(issue.messageParams ?? {}) }
  if (params.slotKey) {
    params.slot = t(String(params.slotKey))
    delete params.slotKey
  }

  return (
    <Button
      size="xs"
      variant="ghost"
      justifyContent="flex-start"
      h="auto"
      py={1.5}
      px={2}
      fontWeight="normal"
      color={issue.severity === 'error' ? 'red.300' : 'orange.300'}
      onClick={() => issue.nodeId && onFocusNode(issue.nodeId)}
      disabled={!issue.nodeId}
    >
      <AlertCircle size={12} />
      {t(issue.messageKey, params)}
    </Button>
  )
}

function ExecutionStepRow({
  step,
  index,
  project,
  active,
  done,
  onFocus,
}: {
  step: FlowExecutionStep
  index: number
  project: ProjectDetail
  active?: boolean
  done?: boolean
  onFocus: () => void
}) {
  const { t } = useLocale()
  const node = project.nodes.find((n) => n.id === step.nodeId)
  const role = node ? roleForKind(node.kind, node.role) : 'action'

  return (
    <HStack
      className={[
        'project-flow-explorer__step',
        active ? 'project-flow-explorer__step--active' : '',
        done ? 'project-flow-explorer__step--done' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      gap={2}
      px={2}
      py={1.5}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      cursor="pointer"
      onClick={onFocus}
      _hover={{ bg: 'bg.panelHover' }}
    >
      <Text fontSize="xs" color="fg.subtle" w="1.25rem" flexShrink={0}>
        {index + 1}
      </Text>
      <Badge
        size="sm"
        variant="subtle"
        textTransform="none"
        colorPalette={step.phase === 'config' ? 'purple' : 'blue'}
      >
        {step.phase === 'config'
          ? t('projects.flowExplorer.phaseConfig')
          : t('projects.flowExplorer.phaseMain')}
      </Badge>
      <Box minW={0} flex={1}>
        <Text fontSize="xs" fontWeight="medium" lineClamp={1}>
          {node?.label ?? step.nodeId}
        </Text>
        <Text fontSize="2xs" color="fg.subtle" lineClamp={1}>
          {t(`projects.addNode.roles.${role}`)}
        </Text>
      </Box>
    </HStack>
  )
}
