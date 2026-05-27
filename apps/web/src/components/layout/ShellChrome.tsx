import { Badge, Box, HStack, type BoxProps, type StackProps } from '@chakra-ui/react'
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


export function BrandVersionBadge({
  version,
  updateAvailable,
}: {
  version?: string
  updateAvailable?: boolean
}) {
  if (!version) return null

  return (
    <Badge
      size="xs"
      variant="subtle"
      colorPalette={updateAvailable ? 'green' : 'gray'}
      fontSize="2xs"
      fontFamily="mono"
      fontWeight="medium"
      px={1}
      py={0}
      borderRadius="sm"
      lineHeight="1.3"
      flexShrink={0}
      title={updateAvailable ? `Update available (v${version})` : `Version ${version}`}
    >
      v{version}
    </Badge>
  )
}

export function ShellBrandText({
  collapsed,
  title,
  version,
  updateAvailable,
}: {
  collapsed: boolean
  title: string
  version?: string
  updateAvailable?: boolean
}) {
  if (collapsed) return null

  return (
    <HStack gap={1.5} minW={0} flex={1} align="center">
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
      <BrandVersionBadge version={version} updateAvailable={updateAvailable} />
    </HStack>
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
