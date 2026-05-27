import { Badge } from '@chakra-ui/react'

const paletteMap = {
  success: 'green',
  danger: 'red',
  warning: 'orange',
  neutral: 'gray',
  brand: 'blue',
  running: 'orange',
} as const

export function StatusBadge({
  status,
  label,
}: {
  status: keyof typeof paletteMap | string
  label?: string
}) {
  const key = (status in paletteMap ? status : 'neutral') as keyof typeof paletteMap
  return (
    <Badge
      colorPalette={paletteMap[key]}
      variant="subtle"
      size="sm"
      borderRadius="full"
      px={2.5}
      textTransform="lowercase"
    >
      {label ?? status}
    </Badge>
  )
}
