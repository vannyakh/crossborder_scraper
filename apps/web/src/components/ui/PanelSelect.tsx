import { Button, HStack, Menu, Portal, Text } from '@chakra-ui/react'
import { Check, ChevronDown } from 'lucide-react'
import { useMemo } from 'react'

export type PanelSelectOption = {
  label: string
  value: string
}

const triggerSize = {
  xs: { px: 2, py: 1, minH: '1.75rem', fontSize: 'xs' },
  sm: { px: 3, py: 1.5, minH: '2rem', fontSize: 'sm' },
  md: { px: 3, py: 2, minH: '2.5rem', fontSize: 'sm' },
} as const

/**
 * Menu-style dropdown for panel forms. Uses Chakra Menu (not Select) to avoid
 * Zag `syncSelectElement` crashes on hidden native `<select>` in dialogs.
 */
export function PanelSelect({
  value,
  options,
  onChange,
  disabled,
  minW = '8rem',
  w,
  size = 'sm',
  placeholder = 'Choose…',
  zIndex = 50,
}: {
  value: string
  options: PanelSelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  minW?: string
  w?: string
  size?: 'xs' | 'sm' | 'md'
  placeholder?: string
  zIndex?: number
}) {
  const sizing = triggerSize[size]
  const selectedValue = options.some((o) => o.value === value) ? value : (options[0]?.value ?? '')
  const currentLabel = useMemo(
    () => options.find((o) => o.value === selectedValue)?.label ?? placeholder,
    [options, selectedValue, placeholder],
  )
  const isDisabled = disabled || options.length === 0

  return (
    <Menu.Root positioning={{ sameWidth: true }} closeOnSelect>
      <Menu.Trigger asChild disabled={isDisabled}>
        <Button
          variant="outline"
          w={w}
          minW={minW}
          borderColor="border.subtle"
          borderRadius="var(--radius-input)"
          bg="bg.input"
          fontWeight="normal"
          justifyContent="space-between"
          {...sizing}
        >
          <Text fontSize={sizing.fontSize} truncate flex="1" textAlign="left">
            {currentLabel}
          </Text>
          <ChevronDown size={14} strokeWidth={2} aria-hidden />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner zIndex={zIndex}>
          <Menu.Content
            minW="var(--reference-width)"
            borderRadius="input"
            borderWidth="1px"
            borderColor="border.subtle"
            bg="bg.panel"
            py={1}
            maxH="min(280px, 45vh)"
            overflowY="auto"
            className="app-scroll"
          >
            {options.map((opt) => {
              const selected = opt.value === selectedValue
              return (
                <Menu.Item
                  key={opt.value}
                  value={opt.value}
                  onClick={() => onChange(opt.value)}
                  bg={selected ? 'bg.panelHover' : undefined}
                >
                  <HStack justify="space-between" w="full" gap={2}>
                    <Text fontSize="sm">{opt.label}</Text>
                    {selected ? <Check size={14} strokeWidth={2} aria-hidden /> : null}
                  </HStack>
                </Menu.Item>
              )
            })}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
