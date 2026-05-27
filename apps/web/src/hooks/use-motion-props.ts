import { getMotionDurationSeconds } from '../theme/config'
import { useThemeConfig } from './use-ui-config'

export function useMotionTransition(overrideSeconds?: number) {
  const config = useThemeConfig()

  if (config.reducedMotion) {
    return { duration: 0 }
  }

  return {
    duration: overrideSeconds ?? getMotionDurationSeconds(config.motionSpeed),
    ease: [0.22, 1, 0.36, 1] as const,
  }
}

export function useMotionEnabled() {
  const config = useThemeConfig()
  return !config.reducedMotion
}
