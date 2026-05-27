import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { getMotionDurationSeconds } from '../../theme/config'
import { useThemeConfig } from '../../hooks/use-ui-config'

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const config = useThemeConfig()

  if (config.reducedMotion) {
    return <div className={className}>{children}</div>
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.04 },
    },
  }

  return (
    <motion.div className={className} variants={container} initial="hidden" animate="show">
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const config = useThemeConfig()

  if (config.reducedMotion) {
    return <div className={className}>{children}</div>
  }

  const duration = getMotionDurationSeconds(config.motionSpeed)

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: [0.22, 1, 0.36, 1] as const },
    },
  }

  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  )
}
