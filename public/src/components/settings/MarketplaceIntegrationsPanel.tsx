import { Box, Checkbox, Field, Input, Text, VStack } from '@chakra-ui/react'
import { fieldStyles } from '../ui/field-styles'
import type { MarketplaceEntry } from '../../lib/api'

type Props = {
  marketplaces: Record<string, MarketplaceEntry>
  onChange: (platformId: string, patch: Partial<MarketplaceEntry>) => void
  onCredentialChange: (platformId: string, key: string, value: string) => void
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function MarketplaceIntegrationsPanel({
  marketplaces,
  onChange,
  onCredentialChange,
}: Props) {
  const entries = Object.entries(marketplaces).sort(([a], [b]) => a.localeCompare(b))

  return (
    <VStack align="stretch" gap={4}>
      {entries.map(([platformId, entry]) => (
        <Box
          key={platformId}
          p={3}
          borderRadius="input"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.input"
        >
          <Checkbox.Root
            checked={entry.enabled}
            onCheckedChange={(e) => onChange(platformId, { enabled: !!e.checked })}
            colorPalette="blue"
            mb={2}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label fontSize="sm" fontWeight="medium">
              {entry.label || platformId}
              {entry.supports_export === false ? (
                <Text as="span" fontSize="xs" color="fg.muted" ml={2}>
                  (custom — store credentials for future use)
                </Text>
              ) : null}
            </Checkbox.Label>
          </Checkbox.Root>

          <VStack align="stretch" gap={2} opacity={entry.enabled ? 1 : 0.55}>
            {Object.keys(entry.credentials).map((credKey) => {
              const val = entry.credentials[credKey] ?? ''
              const isSecret = /key|secret|token|password|cipher/i.test(credKey)
              return (
                <Field.Root key={credKey}>
                  <Field.Label fontSize="xs" color="fg.muted">
                    {formatFieldLabel(credKey)}
                  </Field.Label>
                  <Input
                    {...fieldStyles}
                    type={isSecret ? 'password' : 'text'}
                    value={val}
                    placeholder={isSecret && val.includes('…') ? val : ''}
                    onChange={(e) => onCredentialChange(platformId, credKey, e.target.value)}
                    disabled={!entry.enabled}
                  />
                </Field.Root>
              )
            })}
          </VStack>
        </Box>
      ))}
    </VStack>
  )
}
