import Lottie from 'lottie-react'
import type { LottieComponentProps } from 'lottie-react'
import { Box } from '@chakra-ui/react'
import { useThemeConfig } from '../../hooks/use-ui-config'

type LottieAnimationProps = {
  animationData: LottieComponentProps['animationData']
  className?: string
  loop?: boolean
  /** CSS size for the square animation viewport */
  size?: number | string
}

export function LottieAnimation({
  animationData,
  className,
  loop = true,
  size = 280,
}: LottieAnimationProps) {
  const { reducedMotion } = useThemeConfig()

  return (
    <Box
      className={className}
      w={size}
      h={size}
      maxW="100%"
      mx="auto"
      aria-hidden
      pointerEvents="none"
    >
      <Lottie
        animationData={animationData}
        loop={loop && !reducedMotion}
        autoplay={!reducedMotion}
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  )
}
