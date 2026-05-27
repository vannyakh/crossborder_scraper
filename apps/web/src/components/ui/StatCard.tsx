import { Box, Text } from '@chakra-ui/react'

export function StatCard({
  label,
  value,
  mono,
  small,
  tone,
}: {
  label: string
  value: string | number
  mono?: boolean
  small?: boolean
  tone?: 'success' | 'danger' | 'accent' | 'default'
}) {
  const valueColor =
    tone === 'success'
      ? 'green.500'
      : tone === 'danger'
        ? 'red.500'
        : tone === 'accent'
          ? 'accent'
          : 'fg'

  return (
    <Box
      p={3}
      borderRadius="card"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.elevated"
    >
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text
        mt={1}
        fontSize={small ? 'xs' : 'xl'}
        fontWeight="black"
        color={valueColor}
        fontFamily={mono ? 'mono' : 'body'}
        wordBreak={mono ? 'break-all' : 'normal'}
      >
        {value}
      </Text>
    </Box>
  )
}
