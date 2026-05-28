import { Box, Button, HStack, Input, Text } from '@chakra-ui/react'
import type { LucideIcon } from 'lucide-react'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { fieldStyles } from '../ui/field-styles'
import { SectionCard } from '../ui/Section'

export function SettingsCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
}) {
  return (
    <SectionCard h="full">
      <HStack gap={2} mb={4} pb={3} borderBottomWidth="1px" borderColor="border.subtle">
        <Box color="var(--app-accent)" lineHeight={0}>
          <Icon size={17} strokeWidth={2} aria-hidden />
        </Box>
        <Text fontSize="sm" fontWeight="semibold" letterSpacing="0.01em">
          {title}
        </Text>
      </HStack>
      {children}
    </SectionCard>
  )
}

export function SettingRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <Box
      py={3.5}
      borderTopWidth="1px"
      borderColor="border.muted"
      _first={{ borderTopWidth: 0, pt: 0 }}
    >
      <Text fontSize="sm" fontWeight="medium" color="fg">
        {label}
      </Text>
      {hint ? (
        <Text fontSize="xs" color="fg.subtle" mt={0.5} mb={2} lineHeight="1.45">
          {hint}
        </Text>
      ) : (
        <Box mb={2} />
      )}
      {children}
    </Box>
  )
}

export function SettingNotice({ children }: { children: React.ReactNode }) {
  return (
    <Box
      mt={3}
      px={3}
      py={2.5}
      borderRadius="md"
      bg="bg.muted"
      borderWidth="1px"
      borderColor="border.subtle"
    >
      <Text fontSize="xs" color="fg.muted" lineHeight="1.5">
        {children}
      </Text>
    </Box>
  )
}

export function InputWithAction({
  value,
  onChange,
  placeholder,
  readOnly,
  disabled,
  type = 'text',
  mono,
  actionLabel,
  onAction,
  actionLoading,
  actionDisabled,
  actionVariant = 'solid',
}: {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  disabled?: boolean
  type?: string
  mono?: boolean
  actionLabel: string
  onAction?: () => void
  actionLoading?: boolean
  actionDisabled?: boolean
  actionVariant?: 'solid' | 'outline'
}) {
  const accentPalette = useAccentPalette()

  return (
    <HStack gap={2} align="stretch" flexWrap={{ base: 'wrap', sm: 'nowrap' }}>
      <Input
        {...fieldStyles}
        flex={1}
        minW={{ base: 'full', sm: '10rem' }}
        fontSize="sm"
        fontFamily={mono ? 'mono' : undefined}
        type={type}
        value={value}
        readOnly={readOnly}
        disabled={disabled}
        placeholder={placeholder}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
      <Button
        size="sm"
        flexShrink={0}
        minW="4.75rem"
        colorPalette={actionVariant === 'solid' ? accentPalette : undefined}
        variant={actionVariant === 'outline' ? 'outline' : 'solid'}
        borderColor={actionVariant === 'outline' ? 'border.subtle' : undefined}
        loading={actionLoading}
        disabled={actionDisabled ?? !onAction}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </HStack>
  )
}

export function LinkCopyBlock({ label, url }: { label: string; url: string | null }) {
  if (!url) return null

  return (
    <Box>
      <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={1.5}>
        {label}
      </Text>
      <HStack
        gap={0}
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-input)"
        bg="bg.input"
        overflow="hidden"
      >
        <Text
          flex={1}
          px={3}
          py={2}
          fontSize="xs"
          fontFamily="mono"
          color="fg"
          wordBreak="break-all"
          lineHeight="1.4"
        >
          {url}
        </Text>
        <Button
          size="sm"
          variant="ghost"
          borderRadius={0}
          borderLeftWidth="1px"
          borderColor="border.subtle"
          h="auto"
          minH="2.25rem"
          px={3}
          onClick={() => void navigator.clipboard.writeText(url)}
          aria-label={`Copy ${label}`}
        >
          Copy
        </Button>
      </HStack>
    </Box>
  )
}
