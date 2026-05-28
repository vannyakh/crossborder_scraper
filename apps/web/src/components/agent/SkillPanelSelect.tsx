import { HStack, Text } from '@chakra-ui/react'
import { PanelSelect, type PanelSelectOption } from '../ui/PanelSelect'

export type SkillSelectOption = PanelSelectOption & { hint?: string }

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
  return (
    <HStack gap={2} align="center" flexShrink={0}>
      {label ? (
        <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">
          {label}
        </Text>
      ) : null}
      <PanelSelect
        value={value}
        options={options}
        minW={minW}
        disabled={disabled}
        onChange={onChange}
      />
    </HStack>
  )
}
