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

  const isChat = section === 'chat'

  return (
    <Box
      flex={1}
      minH={0}
      minW={0}
      w="full"
      display="flex"
      flexDirection="column"
      className={isChat ? 'agent-page agent-page--chat' : undefined}
    >
      <AnimatePresence mode="wait" initial={false}>
        <MotionBox
          key={section}
          flex={isChat ? 1 : undefined}
          minH={isChat ? 0 : undefined}
          h={isChat ? '100%' : undefined}
          display={isChat ? 'flex' : undefined}
          flexDirection={isChat ? 'column' : undefined}
          w="full"
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
