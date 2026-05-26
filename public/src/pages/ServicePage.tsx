import { Box } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { Navigate, useParams } from 'react-router-dom'
import { ComingSoonPanel } from '../components/service/ComingSoonPanel'
import {
  ServiceHealthSection,
  ServiceOverviewSection,
  ServiceSupportSection,
} from '../components/service/ServiceSectionPanels'
import {
  DEFAULT_SERVICE_SECTION,
  isServiceComingSoon,
  isServiceSectionId,
  serviceSectionPath,
  type ServiceSectionId,
} from '../components/service/service-sections'
import { useMotionEnabled, useMotionTransition } from '../hooks/use-motion-props'

const MotionBox = motion.create(Box)

function ServiceSectionContent({ section }: { section: ServiceSectionId }) {
  if (isServiceComingSoon(section)) {
    return <ComingSoonPanel section={section} />
  }

  switch (section) {
    case 'overview':
      return <ServiceOverviewSection />
    case 'health':
      return <ServiceHealthSection />
    case 'support':
      return <ServiceSupportSection />
    default:
      return null
  }
}

export function ServicePage() {
  const { section: sectionParam } = useParams<{ section?: string }>()
  const section = isServiceSectionId(sectionParam) ? sectionParam : DEFAULT_SERVICE_SECTION
  const motionEnabled = useMotionEnabled()
  const transition = useMotionTransition(0.2)

  if (!isServiceSectionId(sectionParam)) {
    return <Navigate to={serviceSectionPath(DEFAULT_SERVICE_SECTION)} replace />
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
          <ServiceSectionContent section={section} />
        </MotionBox>
      </AnimatePresence>
    </Box>
  )
}
