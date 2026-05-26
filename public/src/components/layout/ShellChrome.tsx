import { Box, HStack, type BoxProps, type StackProps } from '@chakra-ui/react'
import { SHELL_HEADER_HEIGHT } from './constants'
import { ShellLogoMark } from './ShellLogoMark'

export { ShellLogoMark }

/** Top chrome row — shared height/styles for sidebar brand + main navbar */
export function ShellHeaderRow({ children, ...props }: StackProps) {
  return (
    <HStack
      h={SHELL_HEADER_HEIGHT}
      minH={SHELL_HEADER_HEIGHT}
      flexShrink={0}
      px="var(--shell-padding-inline)"
      borderBottomWidth="1px"
      borderColor="border.subtle"
      bg="bg.navbar"
      gap={2}
      {...props}
    >
      {children}
    </HStack>
  )
}

/** Scrollable region with themed scrollbar */
export function ShellScrollArea({ children, className, ...props }: BoxProps) {
  return (
    <Box className={className ? `app-scroll ${className}` : 'app-scroll'} {...props}>
      {children}
    </Box>
  )
}

export function ShellFooter({ children, ...props }: BoxProps) {
  return (
    <Box
      flexShrink={0}
      px="var(--shell-padding-inline)"
      py="calc(var(--shell-padding) * 0.65)"
      borderTopWidth="1px"
      borderColor="border.subtle"
      bg="bg.sidebar"
      fontSize="xs"
      color="fg.muted"
      {...props}
    >
      {children}
    </Box>
  )
}


export function ShellBrandText({ collapsed, title }: { collapsed: boolean; title: string }) {
  if (collapsed) return null

  return (
    <Box
      as="span"
      minW={0}
      flex={1}
      display="block"
      fontFamily="heading"
      fontWeight="semibold"
      fontSize="sm"
      lineHeight="1"
      letterSpacing="-0.05em"
      textTransform="uppercase"
      color="fg"
      truncate
    >
      {title}
    </Box>
  )
}

export function ShellMainContent({ children, ...props }: BoxProps) {
  return (
    <Box
      as="main"
      className="app-scroll app-content"
      flex="1 1 auto"
      w="full"
      minW={0}
      minH={0}
      h={0}
      p="var(--shell-padding)"
      overflowX="hidden"
      overflowY="auto"
      css={{
        WebkitOverflowScrolling: 'touch',
      }}
      {...props}
    >
      {children}
    </Box>
  )
}
