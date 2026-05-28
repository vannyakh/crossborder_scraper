import { Box } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { Navigate, useParams } from 'react-router-dom'
import { ToolCatalogPanel } from '../components/debug/ToolCatalogPanel'
import {
  DEFAULT_DEBUG_SECTION,
  debugSectionPath,
  isDebugSectionId,
  type DebugSectionId,
} from '../components/debug/debug-sections'
import { useMotionEnabled, useMotionTransition } from '../hooks/use-motion-props'
import { LogsPage } from './LogsPage'

const MotionBox = motion.create(Box)

function DebugSectionContent({ section }: { section: DebugSectionId }) {
  switch (section) {
    case 'logs':
      return <LogsPage />
    case 'tools':
      return <ToolCatalogPanel />
    default:
      return null
  }
}

export function DebugPage() {
  const { section: sectionParam } = useParams<{ section?: string }>()
  const section = isDebugSectionId(sectionParam) ? sectionParam : DEFAULT_DEBUG_SECTION
  const motionEnabled = useMotionEnabled()
  const transition = useMotionTransition(0.2)

  if (!isDebugSectionId(sectionParam)) {
    return <Navigate to={debugSectionPath(DEFAULT_DEBUG_SECTION)} replace />
  }

  return (
    <Box flex={1} minH={0} minW={0} w="full" display="flex" flexDirection="column">
      <AnimatePresence mode="wait" initial={false}>
        <MotionBox
          key={section}
          w="full"
          initial={motionEnabled ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={motionEnabled ? { opacity: 0, y: -6 } : undefined}
          transition={transition}
        >
          <DebugSectionContent section={section} />
        </MotionBox>
      </AnimatePresence>
    </Box>
  )
}
