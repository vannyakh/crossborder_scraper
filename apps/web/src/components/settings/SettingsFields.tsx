import { Checkbox, Field } from '@chakra-ui/react'
import { useAccentPalette } from '../../hooks/use-ui-config'

export function SettingsCheckbox({
  checked,
  onCheckedChange,
  children,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children: React.ReactNode
}) {
  const accentPalette = useAccentPalette()
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={(e) => onCheckedChange(!!e.checked)}
      colorPalette={accentPalette}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control />
      <Checkbox.Label fontSize="sm">{children}</Checkbox.Label>
    </Checkbox.Root>
  )
}

export function SettingsField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <Field.Root>
      <Field.Label fontSize="xs" color="fg.muted">
        {label}
      </Field.Label>
      {children}
      {hint ? (
        <Field.HelperText fontSize="xs" color="fg.subtle">
          {hint}
        </Field.HelperText>
      ) : null}
    </Field.Root>
  )
}
