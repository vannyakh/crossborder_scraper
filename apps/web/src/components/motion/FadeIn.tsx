import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { getMotionDurationSeconds } from '../../theme/config'
import { useThemeConfig } from '../../hooks/use-ui-config'

type FadeInProps = {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}

export function FadeIn({ children, delay = 0, y = 16, className }: FadeInProps) {
  const config = useThemeConfig()

  if (config.reducedMotion) {
    return <div className={className}>{children}</div>
  }

  const duration = getMotionDurationSeconds(config.motionSpeed)

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] as const }}
    >
      {children}
    </motion.div>
  )
}
