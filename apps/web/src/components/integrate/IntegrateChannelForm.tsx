import {
  Box,
  Button,
  Checkbox,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Separator,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { Send } from 'lucide-react'
import { useState } from 'react'
import type { GatewayPrompt, IntegrateChannelDetail, IntegrateChannelField } from '../../lib/api'
import { useUpdateIntegrateChannelMutation } from '../../hooks'
import { fieldStyles } from '../ui/field-styles'
import { SectionCard, SubtitleText } from '../ui/Section'
import {
  groupIntegrateFields,
  INTEGRATE_SECTION_LABEL,
  INTEGRATE_SECTION_ORDER,
  type IntegrateFieldSection,
} from './integrate-field-groups'

function parseIdList(raw: string): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const part of raw.split(/[\s,]+/)) {
    const trimmed = part.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    ids.push(trimmed)
  }
  return ids
}

function parseChatIds(raw: string): number[] {
  return parseIdList(raw)
    .map((part) => Number(part))
    .filter((n) => !Number.isNaN(n))
}

function formatList(values: unknown): string {
  if (!Array.isArray(values)) return ''
  return values.map(String).join(', ')
}

function buildDraft(channel: IntegrateChannelDetail): Record<string, unknown> {
  const initial: Record<string, unknown> = {}
  for (const field of channel.fields) {
    if (field.type === 'secret') {
      initial[field.key] = ''
      continue
    }
    if (field.type === 'chat_ids' || field.type === 'channel_ids') {
      initial[field.key] = formatList(channel.config?.[field.key])
      continue
    }
    initial[field.key] = channel.config?.[field.key] ?? (field.type === 'boolean' ? false : '')
  }
  return initial
}

function FieldControl({
  field,
  value,
  secretSet,
  secretMasked,
  onChange,
  prompts,
}: {
  field: IntegrateChannelField
  value: unknown
  secretSet?: boolean
  secretMasked?: string
  onChange: (value: unknown) => void
  prompts: GatewayPrompt[]
}) {
  if (field.type === 'boolean') {
    return (
      <Checkbox.Root checked={Boolean(value)} onCheckedChange={(e) => onChange(!!e.checked)}>
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label fontSize="sm">{field.label}</Checkbox.Label>
      </Checkbox.Root>
    )
  }

  if (field.type === 'prompt') {
    const promptId = String(value ?? 'gateway_agent')
    return (
      <Field.Root>
        <Field.Label fontSize="xs" color="fg.muted">
          {field.label}
        </Field.Label>
        <NativeSelect.Root {...fieldStyles}>
          <NativeSelect.Field value={promptId} onChange={(e) => onChange(e.target.value)}>
            {prompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            {prompts.length === 0 ? <option value="gateway_agent">gateway_agent</option> : null}
          </NativeSelect.Field>
        </NativeSelect.Root>
      </Field.Root>
    )
  }

  if (field.type === 'chat_ids' || field.type === 'channel_ids') {
    return (
      <Field.Root>
        <Field.Label fontSize="xs" color="fg.muted">
          {field.label}
        </Field.Label>
        <Textarea
          {...fieldStyles}
          rows={3}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          fontFamily="mono"
          fontSize="sm"
        />
        {field.helper ? <Field.HelperText fontSize="xs">{field.helper}</Field.HelperText> : null}
      </Field.Root>
    )
  }

  const isSecret = field.type === 'secret'
  const isNumber = field.type === 'number'

  return (
    <Field.Root>
      <Field.Label fontSize="xs" color="fg.muted">
        {field.label}
      </Field.Label>
      <Input
        {...fieldStyles}
        type={isSecret ? 'password' : isNumber ? 'number' : 'text'}
        autoComplete={isSecret ? 'off' : undefined}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          isSecret && secretSet ? `Current: ${secretMasked ?? 'set'}` : field.placeholder
        }
      />
      {field.helper ? <Field.HelperText fontSize="xs">{field.helper}</Field.HelperText> : null}
    </Field.Root>
  )
}

function FieldSectionBlock({
  section,
  fields,
  draft,
  config,
  prompts,
  onChange,
}: {
  section: IntegrateFieldSection
  fields: IntegrateChannelField[]
  draft: Record<string, unknown>
  config: Record<string, unknown>
  prompts: GatewayPrompt[]
  onChange: (key: string, value: unknown) => void
}) {
  if (fields.length === 0) return null

  const isOptions = section === 'options'

  return (
    <Box>
      <SubtitleText mb={3}>{INTEGRATE_SECTION_LABEL[section]}</SubtitleText>
      {isOptions ? (
        <VStack align="stretch" gap={3}>
          {fields.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              value={draft[field.key]}
              onChange={(value) => onChange(field.key, value)}
              prompts={prompts}
            />
          ))}
        </VStack>
      ) : (
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
          {fields.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              value={draft[field.key]}
              secretSet={Boolean(config[`${field.key}_set`])}
              secretMasked={String(config[`${field.key}_masked`] ?? '')}
              onChange={(value) => onChange(field.key, value)}
              prompts={prompts}
            />
          ))}
        </Grid>
      )}
    </Box>
  )
}

export function IntegrateChannelForm({
  channel,
  prompts,
  accentPalette,
}: {
  channel: IntegrateChannelDetail
  prompts: GatewayPrompt[]
  accentPalette: string
}) {
  const updateMutation = useUpdateIntegrateChannelMutation()
  const [draft, setDraft] = useState<Record<string, unknown>>(() => buildDraft(channel))
  const [message, setMessage] = useState<string | null>(null)
  const groups = groupIntegrateFields(channel.fields)
  const visibleSections = INTEGRATE_SECTION_ORDER.filter((s) => groups[s].length > 0)

  async function handleSave() {
    setMessage(null)
    const updates: Record<string, unknown> = {}
    for (const field of channel.fields) {
      const raw = draft[field.key]
      if (field.type === 'secret') {
        if (String(raw ?? '').trim()) updates[field.key] = String(raw).trim()
        continue
      }
      if (field.type === 'chat_ids') {
        updates[field.key] = parseChatIds(String(raw ?? ''))
        continue
      }
      if (field.type === 'channel_ids') {
        updates[field.key] = parseIdList(String(raw ?? ''))
        continue
      }
      if (field.type === 'number') {
        updates[field.key] = Number(raw) || 0
        continue
      }
      updates[field.key] = raw
    }
    try {
      await updateMutation.mutateAsync({ channelId: channel.id, updates })
      setMessage(
        channel.runner === 'live'
          ? 'Saved — channel runner reloaded.'
          : 'Credentials saved.',
      )
      for (const field of channel.fields) {
        if (field.type === 'secret') {
          setDraft((prev) => ({ ...prev, [field.key]: '' }))
        }
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed')
    }
  }

  return (
    <SectionCard>
      <VStack align="stretch" gap={5} separator={<Separator borderColor="border.subtle" />}>
        {visibleSections.map((section) => (
          <FieldSectionBlock
            key={section}
            section={section}
            fields={groups[section]}
            draft={draft}
            config={channel.config ?? {}}
            prompts={prompts}
            onChange={(key, value) => setDraft((prev) => ({ ...prev, [key]: value }))}
          />
        ))}
      </VStack>

      <HStack mt={6} pt={4} borderTopWidth="1px" borderColor="border.subtle" justify="space-between" flexWrap="wrap" gap={3}>
        <Text fontSize="sm" color={message?.includes('failed') ? 'red.500' : 'fg.muted'}>
          {message ?? 'Changes apply after save.'}
        </Text>
        <Button
          colorPalette={accentPalette}
          loading={updateMutation.isPending}
          onClick={() => void handleSave()}
        >
          <Send size={16} />
          {channel.runner === 'live' ? 'Save & reload' : 'Save credentials'}
        </Button>
      </HStack>
    </SectionCard>
  )
}

export function integrateFormKey(channel: IntegrateChannelDetail): string {
  return JSON.stringify(channel.config ?? {})
}
