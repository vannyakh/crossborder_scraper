import { Box, type BoxProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

/** Card / panel shell with diagonal shimmer sweep */
export function ShimmerSurface({ children, className, ...rest }: BoxProps) {
  return (
    <Box
      className={['skeleton-shimmer', className].filter(Boolean).join(' ')}
      position="relative"
      overflow="hidden"
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
  ...rest
}: BoxProps & {
  w?: string | number
  h?: string | number
  radius?: string
}) {
  return (
    <ShimmerSurface borderRadius={radius} h={h} w={w} {...rest}>
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
