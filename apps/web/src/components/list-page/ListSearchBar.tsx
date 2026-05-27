import { HStack, Input } from '@chakra-ui/react'
import { Search } from 'lucide-react'

export function ListSearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <HStack
      flex="1"
      minW={{ base: 'full', sm: '240px' }}
      maxW="md"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-input)"
      px={2}
      bg="bg.input"
    >
      <Search size={14} strokeWidth={2} color="var(--chakra-colors-fg-muted)" />
      <Input
        size="sm"
        variant="flushed"
        border="none"
        flex={1}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </HStack>
  )
}
