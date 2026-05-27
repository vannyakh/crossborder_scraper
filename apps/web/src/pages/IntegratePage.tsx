import { Box } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { Navigate, useParams } from 'react-router-dom'
import { IntegrateChannelSetupPanel } from '../components/integrate/IntegrateChannelSetupPanel'
import {
  DEFAULT_INTEGRATE_CHANNEL,
  integrateSectionPath,
  isIntegrateChannelId,
  type IntegrateChannelId,
} from '../components/integrate/integrate-sections'
import { useMotionEnabled, useMotionTransition } from '../hooks/use-motion-props'

const MotionBox = motion.create(Box)

export function IntegratePage() {
  const { section: sectionParam } = useParams<{ section?: string }>()
  const channel = isIntegrateChannelId(sectionParam) ? sectionParam : DEFAULT_INTEGRATE_CHANNEL
  const motionEnabled = useMotionEnabled()
  const transition = useMotionTransition(0.2)

  if (!isIntegrateChannelId(sectionParam)) {
    return <Navigate to={integrateSectionPath(DEFAULT_INTEGRATE_CHANNEL)} replace />
  }

  return (
    <Box flex={1} minH={0} minW={0} w="full" display="flex" flexDirection="column">
      <AnimatePresence mode="wait" initial={false}>
        <MotionBox
          key={channel}
          w="full"
          initial={motionEnabled ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={motionEnabled ? { opacity: 0, y: -6 } : undefined}
          transition={transition}
        >
          <IntegrateChannelSetupPanel channelId={channel as IntegrateChannelId} />
        </MotionBox>
      </AnimatePresence>
    </Box>
  )
}
