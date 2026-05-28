import { HStack, IconButton, Input, Text } from '@chakra-ui/react'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { fieldStyles } from '../ui/field-styles'

export function CopyableSecretField({
  label,
  value,
  placeholder = '—',
  onReveal,
  loading,
}: {
  label: string
  value: string
  placeholder?: string
  onReveal?: () => void
  loading?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!value) {
      onReveal?.()
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <HStack gap={2} w="full" align="flex-end">
      <Text fontSize="xs" color="fg.muted" minW="5rem" flexShrink={0} pt={2}>
        {label}
      </Text>
      <Input
        {...fieldStyles}
        size="sm"
        flex={1}
        type={visible ? 'text' : 'password'}
        readOnly
        value={value}
        placeholder={loading ? 'Loading…' : placeholder}
        fontFamily="mono"
        fontSize="xs"
      />
      <IconButton
        size="sm"
        variant="outline"
        borderColor="border.subtle"
        borderRadius="input"
        aria-label={visible ? 'Hide' : 'Show'}
        onClick={() => {
          if (!value) onReveal?.()
          setVisible((v) => !v)
        }}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </IconButton>
      <IconButton
        size="sm"
        variant="outline"
        borderColor="border.subtle"
        borderRadius="input"
        aria-label="Copy"
        onClick={() => void handleCopy()}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </IconButton>
    </HStack>
  )
}
