import { Text } from '@chakra-ui/react'

export function SidebarNavSection({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null

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
