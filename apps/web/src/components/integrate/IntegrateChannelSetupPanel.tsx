import {
  Box,
  Button,
  Checkbox,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { RefreshCw, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { GatewayPrompt, IntegrateChannelDetail, IntegrateChannelField } from '../../lib/api'
import {
  useGatewayPromptsQuery,
  useGatewayStatusQuery,
  useIntegrateChannelQuery,
  useReloadIntegrateChannelMutation,
  useUpdateIntegrateChannelMutation,
} from '../../hooks'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { fieldStyles } from '../ui/field-styles'
import { FormFieldsSkeleton } from '../ui/PanelSkeleton'
import { Section, SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import type { IntegrateChannelId } from './integrate-sections'

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

function configFormKey(channel: IntegrateChannelDetail): string {
  return JSON.stringify(channel.config ?? {})
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
      <Checkbox.Root
        checked={Boolean(value)}
        onCheckedChange={(e) => onChange(!!e.checked)}
      >
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
        {field.helper ? (
          <Field.HelperText fontSize="xs">{field.helper}</Field.HelperText>
        ) : null}
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
      {isSecret ? (
        <Input
          {...fieldStyles}
          type="password"
          autoComplete="off"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={secretSet ? `Current: ${secretMasked ?? 'set'}` : field.placeholder}
        />
      ) : (
        <Input
          {...fieldStyles}
          type={isNumber ? 'number' : 'text'}
          value={String(value ?? '')}
          onChange={(e) => onChange(isNumber ? e.target.value : e.target.value)}
          placeholder={field.placeholder}
        />
      )}
      {field.helper ? <Field.HelperText fontSize="xs">{field.helper}</Field.HelperText> : null}
    </Field.Root>
  )
}

function IntegrateChannelForm({
  channel,
  prompts,
  accentPalette,
}: {
  channel: IntegrateChannelDetail
  prompts: GatewayPrompt[]
  accentPalette: string
}) {
  const updateMutation = useUpdateIntegrateChannelMutation()
  const [draft, setDraft] = useState<Record<string, unknown>>(() => {
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
  })
  const [message, setMessage] = useState<string | null>(null)

  const booleanFields = channel.fields.filter((f) => f.type === 'boolean')
  const otherFields = channel.fields.filter((f) => f.type !== 'boolean')

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
          ? 'Channel settings saved. Runner reloads automatically when the panel is running.'
          : 'Credentials saved. Live runner ships in a future release.',
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
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
        <VStack align="stretch" gap={4}>
          {booleanFields.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              value={draft[field.key]}
              onChange={(value) => setDraft((prev) => ({ ...prev, [field.key]: value }))}
              prompts={prompts}
            />
          ))}
          {otherFields
            .filter((_, index) => index % 2 === 0)
            .map((field) => (
              <FieldControl
                key={field.key}
                field={field}
                value={draft[field.key]}
                secretSet={Boolean(channel.config?.[`${field.key}_set`])}
                secretMasked={String(channel.config?.[`${field.key}_masked`] ?? '')}
                onChange={(value) => setDraft((prev) => ({ ...prev, [field.key]: value }))}
                prompts={prompts}
              />
            ))}
        </VStack>
        <VStack align="stretch" gap={4}>
          {otherFields
            .filter((_, index) => index % 2 === 1)
            .map((field) => (
              <FieldControl
                key={field.key}
                field={field}
                value={draft[field.key]}
                secretSet={Boolean(channel.config?.[`${field.key}_set`])}
                secretMasked={String(channel.config?.[`${field.key}_masked`] ?? '')}
                onChange={(value) => setDraft((prev) => ({ ...prev, [field.key]: value }))}
                prompts={prompts}
              />
            ))}
        </VStack>
      </Grid>

      <HStack mt={6} justify="space-between" flexWrap="wrap" gap={3}>
        <Text fontSize="sm" color={message?.includes('failed') ? 'red.500' : 'fg.muted'}>
          {message ?? 'Saved.'}
        </Text>
        <Button
          colorPalette={accentPalette}
          loading={updateMutation.isPending}
          onClick={() => void handleSave()}
        >
          <Send size={16} />
          {channel.runner === 'live' ? 'Save & reload channel' : 'Save credentials'}
        </Button>
      </HStack>
    </SectionCard>
  )
}

export function IntegrateChannelSetupPanel({ channelId }: { channelId: IntegrateChannelId }) {
  const accentPalette = useAccentPalette()
  const gatewayQuery = useGatewayStatusQuery()
  const channelQuery = useIntegrateChannelQuery(channelId)
  const promptsQuery = useGatewayPromptsQuery()
  const reloadMutation = useReloadIntegrateChannelMutation()

  const channel = channelQuery.data
  const prompts = promptsQuery.data?.items ?? []
  const aiReady =
    Boolean(gatewayQuery.data?.runtime?.ai?.ai_enabled) &&
    Boolean(gatewayQuery.data?.runtime?.ai?.ai_api_key_set)

  const statusTone = useMemo(() => {
    if (!channel) return 'neutral' as const
    if (channel.runtime_active) return 'success' as const
    if (channel.configured) return 'running' as const
    return 'neutral' as const
  }, [channel])

  const statusLabel = useMemo(() => {
    if (!channel) return 'loading'
    if (channel.runtime_active) return 'live'
    if (channel.enabled && channel.configured) return 'enabled'
    if (channel.configured) return 'configured'
    return 'not configured'
  }, [channel])

  if (channelQuery.isLoading || !channel) {
    return <FormFieldsSkeleton fields={6} />
  }

  return (
    <Section title={channel.label} description={channel.description} mt={0}>
      <SectionCard mb={4}>
        <HStack justify="space-between" flexWrap="wrap" gap={3} mb={3}>
          <HStack gap={2} flexWrap="wrap">
            <StatusBadge status={statusTone} label={statusLabel} />
            <Text fontSize="xs" color="fg.muted">
              {channel.runner === 'live' ? 'Live runner' : 'Credentials stored · runner coming soon'}
            </Text>
          </HStack>
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void channelQuery.refetch()
                void gatewayQuery.refetch()
              }}
              loading={channelQuery.isFetching}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
            {channel.runner === 'live' ? (
              <Button
                size="sm"
                variant="outline"
                loading={reloadMutation.isPending}
                onClick={() => void reloadMutation.mutateAsync(channelId)}
              >
                Reload runner
              </Button>
            ) : null}
          </HStack>
        </HStack>

        {channelId === 'telegram' && !aiReady ? (
          <Box
            p={3}
            borderRadius="md"
            bg="orange.50"
            borderWidth="1px"
            borderColor="orange.200"
            _dark={{ bg: 'orange.950', borderColor: 'orange.800' }}
          >
            <Text fontSize="sm" color="fg">
              Enable the gateway agent and set an API key under{' '}
              <Text as="span" fontWeight="semibold">
                Settings → AI & LLM
              </Text>{' '}
              before Telegram replies will work.
            </Text>
          </Box>
        ) : null}

        {channel.runner === 'stored' ? (
          <Box
            mt={channelId === 'telegram' && !aiReady ? 3 : 0}
            p={3}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border.subtle"
            bg="bg.panelHover"
          >
            <Text fontSize="sm" color="fg.muted">
              Save credentials here now. When the live runner ships, the same settings will control
              the gateway agent on this channel.
            </Text>
          </Box>
        ) : null}
      </SectionCard>

      <SectionCard mb={4}>
        <Text fontSize="sm" fontWeight="semibold" mb={2}>
          Setup
        </Text>
        <VStack align="stretch" gap={2} fontSize="sm" color="fg.muted" lineHeight="tall">
          {channel.setup_steps.map((step, index) => (
            <Text key={step}>
              {index + 1}. {step}
            </Text>
          ))}
        </VStack>
      </SectionCard>

      <IntegrateChannelForm
        key={configFormKey(channel)}
        channel={channel}
        prompts={prompts}
        accentPalette={accentPalette}
      />
    </Section>
  )
}
