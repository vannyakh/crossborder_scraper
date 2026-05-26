import { Box } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import {
  getMotionDurationSeconds,
  type PageTransitionStyle,
} from '../../theme/config'
import { useThemeConfig } from '../../hooks/use-ui-config'

const MotionBox = motion.create(Box)

function getVariants(style: PageTransitionStyle) {
  switch (style) {
    case 'fade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    case 'slide-up':
      return {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      }
    case 'scale':
      return {
        initial: { opacity: 0, scale: 0.98 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.99 },
      }
    case 'slide':
    default:
      return {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
      }
  }
}

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  const config = useThemeConfig()

  const disabled =
    config.reducedMotion ||
    !config.pageTransitions ||
    config.pageTransition === 'none'

  if (disabled) {
    return (
      <Box
        key={location.pathname}
        w="full"
        minW={0}
        flex="1 1 auto"
        minH={0}
        display="flex"
        flexDirection="column"
      >
        {children}
      </Box>
    )
  }

  const duration = getMotionDurationSeconds(config.motionSpeed)
  const variants = getVariants(config.pageTransition)

  return (
    <AnimatePresence mode="wait">
      <MotionBox
        key={location.pathname}
        w="full"
        minW={0}
        flex="1 1 auto"
        minH={0}
        display="flex"
        flexDirection="column"
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={{ duration, ease: 'easeOut' }}
      >
        {children}
      </MotionBox>
    </AnimatePresence>
  )
}
