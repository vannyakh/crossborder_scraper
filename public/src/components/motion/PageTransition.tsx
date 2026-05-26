import { Box } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

const MotionBox = motion.create(Box)

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <MotionBox
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        {children}
      </MotionBox>
    </AnimatePresence>
  )
}
