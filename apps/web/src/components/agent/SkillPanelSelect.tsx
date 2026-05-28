import { HStack, Portal, Select, Text, createListCollection } from '@chakra-ui/react'
import { Check, ChevronDown } from 'lucide-react'
import { useMemo } from 'react'

export type SkillSelectOption = {
  label: string
  value: string
  hint?: string
}

export function SkillPanelSelect({
  label,
  value,
  options,
  minW = '168px',
  disabled,
  onChange,
}: {
  label?: string
  value: string
  options: SkillSelectOption[]
  minW?: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const collection = useMemo(() => createListCollection({ items: options }), [options])

  return (
    <HStack gap={2} align="center" flexShrink={0}>
      {label ? (
        <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">
          {label}
        </Text>
      ) : null}
      <Select.Root
        collection={collection}
        value={[value]}
        disabled={disabled || options.length === 0}
        positioning={{ sameWidth: true }}
        size="sm"
        onValueChange={(details) => {
          const next = details.value[0]
          if (next) onChange(next)
        }}
      >
        <Select.HiddenSelect />
        <Select.Control minW={minW}>
          <Select.Trigger
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="var(--radius-input)"
            bg="bg.input"
            px={3}
            py={1.5}
            minH="2rem"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap={2}
            cursor="pointer"
          >
            <Select.ValueText placeholder="Choose…" fontSize="sm" />
            <Select.IndicatorGroup>
              <Select.Indicator>
                <ChevronDown size={14} strokeWidth={2} aria-hidden />
              </Select.Indicator>
            </Select.IndicatorGroup>
          </Select.Trigger>
        </Select.Control>
        <Portal>
          <Select.Positioner zIndex={50}>
            <Select.Content
              borderRadius="input"
              borderWidth="1px"
              borderColor="border.subtle"
              bg="bg.panel"
              py={1}
              minW={minW}
              maxH="min(280px, 45vh)"
              overflowY="auto"
              className="app-scroll"
            >
              {collection.items.map((item) => (
                <Select.Item key={item.value} item={item} px={3} py={2}>
                  <HStack justify="space-between" w="full" gap={2}>
                    <Select.ItemText fontSize="sm">{item.label}</Select.ItemText>
                    <Select.ItemIndicator>
                      <Check size={14} strokeWidth={2} aria-hidden />
                    </Select.ItemIndicator>
                  </HStack>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
    </HStack>
  )
}
