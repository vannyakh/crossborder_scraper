import { Box, HStack, type BoxProps, type StackProps } from '@chakra-ui/react'
import { SHELL_HEADER_HEIGHT } from './constants'

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

export function ShellLogoMark({ collapsed, label }: { collapsed: boolean; label: string }) {
  return (
    <HStack
      gap={2}
      minW={0}
      justify={collapsed ? 'center' : 'flex-start'}
      w={collapsed ? 'full' : 'auto'}
    >
      <Box
        w={8}
        h={8}
        flexShrink={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        borderRadius="var(--radius-input)"
        bg="var(--nav-active-bg)"
        color="var(--app-accent)"
        fontWeight="bold"
        fontSize="sm"
        lineHeight={1}
      >
        {label.charAt(0)}
      </Box>
    </HStack>
  )
}

export function ShellBrandText({
  collapsed,
  title,
  subtitle,
}: {
  collapsed: boolean
  title: string
  subtitle?: string
}) {
  if (collapsed) return null

  return (
    <Box minW={0} flex={1}>
      <Box
        as="span"
        display="block"
        fontWeight="bold"
        fontSize="sm"
        lineHeight="1.2"
        color="brand.emphasis"
        truncate
      >
        {title}
      </Box>
      {subtitle ? (
        <Box as="span" display="block" fontSize="xs" color="fg.muted" lineHeight="1.2" truncate>
          {subtitle}
        </Box>
      ) : null}
    </Box>
  )
}

export function ShellMainContent({ children, ...props }: BoxProps) {
  return (
    <Box
      as="main"
      className="app-scroll app-content"
      flex={1}
      w="full"
      minW={0}
      minH={0}
      p="var(--shell-padding)"
      overflowX="hidden"
      overflowY="auto"
      {...props}
    >
      {children}
    </Box>
  )
}
