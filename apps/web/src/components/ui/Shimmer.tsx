import { Box, type BoxProps } from '@chakra-ui/react'
import type { CSSProperties, ReactNode } from 'react'

type ShimmerSurfaceProps = BoxProps & {
  /** Stagger shimmer sweep (e.g. `0.12s`) via `--shimmer-delay`. */
  delay?: string
}

/** Card / panel shell with diagonal shimmer sweep */
export function ShimmerSurface({
  children,
  className,
  delay,
  style,
  ...rest
}: ShimmerSurfaceProps) {
  return (
    <Box
      className={['skeleton-shimmer', className].filter(Boolean).join(' ')}
      position="relative"
      overflow="hidden"
      style={delay ? ({ ...style, '--shimmer-delay': delay } as CSSProperties) : style}
      {...rest}
    >
      {children}
    </Box>
  )
}

/** Static placeholder shape inside a shimmer surface */
export function ShimmerBlock({
  w = 'full',
  h = '14px',
  radius = 'var(--radius-card)',
  ...rest
}: BoxProps & {
  w?: string | number
  h?: string | number
  radius?: string
}) {
  return (
    <Box
      className="skeleton-block"
      width={w}
      height={h}
      borderRadius={radius}
      flexShrink={0}
      {...rest}
    />
  )
}

/** Inline shimmer bar (footer, headings) */
export function ShimmerBar({
  w = 'full',
  h = '14px',
  radius = 'var(--radius-card)',
  delay,
  ...rest
}: ShimmerSurfaceProps & {
  w?: string | number
  h?: string | number
  radius?: string
}) {
  return (
    <ShimmerSurface borderRadius={radius} delay={delay} h={h} w={w} {...rest}>
      <ShimmerBlock w="full" h="full" radius={radius} />
    </ShimmerSurface>
  )
}

export function ShimmerWrap({
  children,
  loading,
  skeleton,
}: {
  children: ReactNode
  loading: boolean
  skeleton: ReactNode
}) {
  return <>{loading ? skeleton : children}</>
}
