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
import { useState } from 'react'
import type { GatewayPrompt, TelegramChannelConfig, TelegramChannelUpdate } from '../../lib/api'
import { fieldStyles } from '../ui/field-styles'
import { Section, SectionCard } from '../ui/Section'
import { FormFieldsSkeleton } from '../ui/PanelSkeleton'
import { StatusBadge } from '../ui/StatusBadge'
import {
  useGatewayPromptsQuery,
  useGatewayStatusQuery,
  useTelegramChannelQuery,
  useUpdateTelegramChannelMutation,
} from '../../hooks'
import { useAccentPalette } from '../../hooks/use-ui-config'

function parseChatIds(raw: string): number[] {
  const ids: number[] = []
  const seen = new Set<number>()
  for (const part of raw.split(/[\s,]+/)) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const n = Number(trimmed)
    if (!Number.isNaN(n) && !seen.has(n)) {
      seen.add(n)
      ids.push(n)
    }
  }
  return ids
}

function formatChatIds(ids: number[]): string {
  return ids.join(', ')
}

function telegramConfigKey(config: TelegramChannelConfig): string {
  return [
    config.enabled,
    config.allow_any_chat,
    config.prompt_id,
    config.max_reply_chars,
    config.bot_token_set,
    ...(config.control_chat_ids ?? []),
  ].join('|')
}

function TelegramChannelForm({
  config,
  prompts,
  accentPalette,
}: {
  config: TelegramChannelConfig
  prompts: GatewayPrompt[]
  accentPalette: string
}) {
  const updateMutation = useUpdateTelegramChannelMutation()
  const [enabled, setEnabled] = useState(config.enabled)
  const [botToken, setBotToken] = useState('')
  const [chatIdsRaw, setChatIdsRaw] = useState(formatChatIds(config.control_chat_ids ?? []))
  const [allowAnyChat, setAllowAnyChat] = useState(config.allow_any_chat)
  const [promptId, setPromptId] = useState(config.prompt_id || 'gateway_agent')
  const [maxReplyChars, setMaxReplyChars] = useState(String(config.max_reply_chars ?? 3500))
  const [message, setMessage] = useState<string | null>(null)

  async function handleSave() {
    setMessage(null)
    const payload: TelegramChannelUpdate = {
      enabled,
      control_chat_ids: parseChatIds(chatIdsRaw),
      allow_any_chat: allowAnyChat,
      prompt_id: promptId,
      max_reply_chars: Number(maxReplyChars) || 3500,
    }
    if (botToken.trim()) {
      payload.bot_token = botToken.trim()
    }
    try {
      await updateMutation.mutateAsync(payload)
      setBotToken('')
      setMessage('Telegram settings saved. Bot reloads automatically when the panel is running.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed')
    }
  }

  return (
    <SectionCard>
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
        <VStack align="stretch" gap={4}>
          <Checkbox.Root
            checked={enabled}
            onCheckedChange={(e) => setEnabled(!!e.checked)}
            colorPalette={accentPalette}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label fontSize="sm">Enable Telegram bot (long-polling)</Checkbox.Label>
          </Checkbox.Root>

          <Checkbox.Root
            checked={allowAnyChat}
            onCheckedChange={(e) => setAllowAnyChat(!!e.checked)}
            colorPalette={accentPalette}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label fontSize="sm">
              Allow any chat (not recommended for production)
            </Checkbox.Label>
          </Checkbox.Root>

          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted">
              Bot token
            </Field.Label>
            <Input
              {...fieldStyles}
              type="password"
              autoComplete="off"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder={
                config.bot_token_set
                  ? `Current: ${config.bot_token_masked ?? 'set'}`
                  : 'From @BotFather'
              }
            />
            <Field.HelperText fontSize="xs">
              Leave blank to keep the current token. Or set TELEGRAM_BOT_TOKEN in .env.
            </Field.HelperText>
          </Field.Root>
        </VStack>

        <VStack align="stretch" gap={4}>
          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted">
              Allowed chat IDs
            </Field.Label>
            <Textarea
              {...fieldStyles}
              rows={3}
              value={chatIdsRaw}
              onChange={(e) => setChatIdsRaw(e.target.value)}
              placeholder="-1001234567890, 123456789"
              fontFamily="mono"
              fontSize="sm"
            />
            <Field.HelperText fontSize="xs">
              Comma or space separated. Get ids from /start or /getid on your bot.
            </Field.HelperText>
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted">
              Agent prompt
            </Field.Label>
            <NativeSelect.Root {...fieldStyles}>
              <NativeSelect.Field value={promptId} onChange={(e) => setPromptId(e.target.value)}>
                {prompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
                {prompts.length === 0 ? <option value="gateway_agent">gateway_agent</option> : null}
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted">
              Max reply length
            </Field.Label>
            <Input
              {...fieldStyles}
              type="number"
              min={500}
              max={8000}
              value={maxReplyChars}
              onChange={(e) => setMaxReplyChars(e.target.value)}
            />
          </Field.Root>
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
          Save & reload bot
        </Button>
      </HStack>
    </SectionCard>
  )
}

export function AgentTelegramPanel() {
  const accentPalette = useAccentPalette()
  const gatewayQuery = useGatewayStatusQuery()
  const telegramQuery = useTelegramChannelQuery()
  const promptsQuery = useGatewayPromptsQuery()

  const config = telegramQuery.data
  const tgSummary = gatewayQuery.data?.telegram
  const prompts = promptsQuery.data?.items ?? []
  const aiReady =
    Boolean(gatewayQuery.data?.runtime?.ai?.ai_enabled) &&
    Boolean(gatewayQuery.data?.runtime?.ai?.ai_api_key_set)

  const statusTone =
    tgSummary?.enabled && tgSummary?.configured
      ? 'success'
      : tgSummary?.configured
        ? 'neutral'
        : 'neutral'

  return (
    <Section
      title="Telegram"
      description="Control chat channel — messages run the same gateway agent as web chat"
      mt={0}
    >
      <SectionCard mb={4}>
        <HStack justify="space-between" flexWrap="wrap" gap={3} mb={3}>
          <HStack gap={2} flexWrap="wrap">
            <StatusBadge
              status={statusTone}
              label={
                tgSummary?.enabled && tgSummary?.configured
                  ? 'polling'
                  : tgSummary?.configured
                    ? 'configured'
                    : 'not configured'
              }
            />
            {tgSummary ? (
              <Text fontSize="xs" color="fg.muted">
                {tgSummary.control_chats} allowed chat
                {tgSummary.control_chats === 1 ? '' : 's'}
                {tgSummary.allow_any_chat ? ' · any chat allowed' : ''}
              </Text>
            ) : null}
          </HStack>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void telegramQuery.refetch()
              void gatewayQuery.refetch()
            }}
            loading={telegramQuery.isFetching}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </HStack>

        {!aiReady ? (
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
      </SectionCard>

      <SectionCard mb={4}>
        <Text fontSize="sm" fontWeight="semibold" mb={2}>
          Setup
        </Text>
        <VStack align="stretch" gap={2} fontSize="sm" color="fg.muted" lineHeight="tall">
          <Text>1. Create a bot with @BotFather and paste the token below.</Text>
          <Text>2. Enable Telegram and save (panel server must be running).</Text>
          <Text>3. Message your bot /start or /getid — it replies with your chat id.</Text>
          <Text>4. Add that id to allowed chats, save again, then send scrape commands.</Text>
        </VStack>
      </SectionCard>

      {telegramQuery.isLoading ? (
        <FormFieldsSkeleton fields={5} />
      ) : config ? (
        <TelegramChannelForm
          key={telegramConfigKey(config)}
          config={config}
          prompts={prompts}
          accentPalette={accentPalette}
        />
      ) : null}
    </Section>
  )
}
