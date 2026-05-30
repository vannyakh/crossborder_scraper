import { Box } from '@chakra-ui/react'
import { useLottie, type LottieComponentProps } from 'lottie-react'
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
  const { View } = useLottie({
    animationData,
    loop: loop && !reducedMotion,
    autoplay: !reducedMotion,
    style: { width: '100%', height: '100%' },
  })

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
      {View}
    </Box>
  )
}
