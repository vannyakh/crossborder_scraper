import { Box, Checkbox, Field, Input, Text, VStack } from '@chakra-ui/react'
import { motion } from 'motion/react'
import { fieldStyles } from '../ui/field-styles'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { useMotionEnabled, useMotionTransition } from '../../hooks/use-motion-props'
import type { MarketplaceEntry } from '../../lib/api'

const MotionBox = motion.create(Box)

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
  const accentPalette = useAccentPalette()
  const motionEnabled = useMotionEnabled()
  const transition = useMotionTransition(0.16)
  const entries = Object.entries(marketplaces).sort(([a], [b]) => a.localeCompare(b))

  return (
    <VStack align="stretch" gap={3}>
      {entries.map(([platformId, entry]) => (
        <MotionBox
          key={platformId}
          p={4}
          borderRadius="var(--radius-card)"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.input"
          initial={false}
          whileHover={
            motionEnabled
              ? {
                  borderColor: 'color-mix(in srgb, var(--app-accent) 30%, var(--chakra-colors-border-subtle))',
                }
              : undefined
          }
          transition={transition}
        >
          <Checkbox.Root
            checked={entry.enabled}
            onCheckedChange={(e) => onChange(platformId, { enabled: !!e.checked })}
            colorPalette={accentPalette}
            mb={3}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label fontSize="sm" fontWeight="semibold">
              {entry.label || platformId}
              {entry.supports_export === false ? (
                <Text as="span" fontSize="xs" color="fg.muted" ml={2} fontWeight="normal">
                  (custom platform)
                </Text>
              ) : null}
            </Checkbox.Label>
          </Checkbox.Root>

          <VStack
            align="stretch"
            gap={3}
            opacity={entry.enabled ? 1 : 0.5}
            transition="opacity 0.2s ease"
          >
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
                    borderColor="border.subtle"
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
        </MotionBox>
      ))}
    </VStack>
  )
}
