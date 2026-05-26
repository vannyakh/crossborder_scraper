import { Box } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { Navigate, useParams } from 'react-router-dom'
import { AgentToolsPanel, AgentWorkflowsPanel } from '../components/agent/AgentAutomationPanels'
import { AgentChatPanel } from '../components/agent/AgentChatPanel'
import { AgentRunsPanel } from '../components/agent/AgentRunsPanel'
import { AgentSchedulesPanel } from '../components/agent/AgentSchedulesPanel'
import {
  DEFAULT_AGENT_SECTION,
  agentSectionPath,
  isAgentSectionId,
  type AgentSectionId,
} from '../components/agent/agent-sections'
import { useMotionEnabled, useMotionTransition } from '../hooks/use-motion-props'

const MotionBox = motion.create(Box)

function AgentSectionContent({ section }: { section: AgentSectionId }) {
  switch (section) {
    case 'chat':
      return <AgentChatPanel />
    case 'schedules':
      return <AgentSchedulesPanel />
    case 'runs':
      return <AgentRunsPanel />
    case 'workflows':
      return <AgentWorkflowsPanel />
    case 'tools':
      return <AgentToolsPanel />
    default:
      return null
  }
}

export function AgentPage() {
  const { section: sectionParam } = useParams<{ section?: string }>()
  const section = isAgentSectionId(sectionParam) ? sectionParam : DEFAULT_AGENT_SECTION
  const motionEnabled = useMotionEnabled()
  const transition = useMotionTransition(0.2)

  if (!isAgentSectionId(sectionParam)) {
    return <Navigate to={agentSectionPath(DEFAULT_AGENT_SECTION)} replace />
  }

  return (
    <Box flex={1} minW={0} w="full">
      <AnimatePresence mode="wait" initial={false}>
        <MotionBox
          key={section}
          initial={motionEnabled ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={motionEnabled ? { opacity: 0, y: -6 } : undefined}
          transition={transition}
        >
          <AgentSectionContent section={section} />
        </MotionBox>
      </AnimatePresence>
    </Box>
  )
}
