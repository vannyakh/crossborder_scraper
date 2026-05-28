import { Box, Text } from '@chakra-ui/react'

export function SidebarNavSection({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return (
      <Box role="separator" aria-hidden h="1px" mx={1.5} my={2} bg="border.subtle" opacity={0.65} />
    )
  }

  return (
    <Text
      px={2}
      pt={3}
      pb={1}
      fontSize="2xs"
      fontWeight="semibold"
      textTransform="uppercase"
      letterSpacing="wider"
      color="fg.subtle"
      userSelect="none"
    >
      {label}
    </Text>
  )
}
