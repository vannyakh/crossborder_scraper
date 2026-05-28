import { Box, Button, HStack, IconButton, Menu, Portal, Text } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  Brain,
  Check,
  ChevronDown,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  useAgentChatSessionsQuery,
  useCreateChatSessionMutation,
  useGatewayPromptsQuery,
  useGatewayStatusQuery,
  useRunAgentMutation,
  useUpdateChatSessionMutation,
} from '../../hooks'
import { formatModelRef } from '../../config/llm-providers'
import { useMotionEnabled, useMotionTransition } from '../../hooks/use-motion-props'
import { AgentToolTrace } from './AgentToolTrace'
import { ChatPanelSkeleton } from '../ui/PanelSkeleton'
import type { AgentChatSession, GatewayAgentResponse, GatewayPrompt } from '../../lib/api'

const MotionBox = motion.create(Box)

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  kind?: 'session'
  createdAt: Date
  toolCalls?: GatewayAgentResponse['tool_calls']
  promptId?: string
  model?: string | null
  ok?: boolean
}

let messageSeq = 0
function nextMessageId() {
  messageSeq += 1
  return `msg-${messageSeq}`
}

function formatChatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function channelLabel(session: AgentChatSession): string {
  if (session.channel_id === 'panel') return 'Panel'
  if (session.channel_id === 'telegram') return 'Telegram'
  return session.channel_id
}

function sessionDisplayName(session: AgentChatSession | null | undefined): string {
  if (!session) return 'New session'
  return session.display_label?.trim() || session.platform_chat_title?.trim() || session.label
}

function sessionSubtitle(session: AgentChatSession): string {
  const parts: string[] = [`${session.message_count ?? 0} messages`]
  if (session.channel_id !== 'panel') {
    parts.push(platformKindLabel(session.platform_chat_kind))
  }
  if (session.platform_chat_id) {
    parts.push(session.platform_chat_id)
  }
  return parts.join(' · ')
}

function sessionIcon(session: AgentChatSession | null | undefined): string {
  if (!session || session.channel_id === 'panel') return '💬'
  if (session.channel_id === 'telegram') return '📱'
  return '🔗'
}

function sessionMessagesToUi(session: AgentChatSession): ChatMessage[] {
  return session.messages.map((m, idx) => ({
    id: `${session.id}-${idx}`,
    role: m.role,
    content: m.content,
    kind: m.kind ?? undefined,
    createdAt: m.created_at ? new Date(m.created_at) : new Date(),
    toolCalls: m.tool_calls,
    ok: m.ok ?? undefined,
    model: m.model_ref,
  }))
}

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

function platformKindLabel(kind: AgentChatSession['platform_chat_kind']): string {
  if (kind === 'group') return 'group'
  if (kind === 'direct') return 'direct'
  return 'bot'
}

type SessionGroup = { id: string; label: string; sessions: AgentChatSession[] }

function groupSessions(sessions: AgentChatSession[]): SessionGroup[] {
  const panel = sessions.filter((s) => s.channel_id === 'panel')
  const tgDirect = sessions.filter(
    (s) => s.channel_id === 'telegram' && s.platform_chat_kind === 'direct',
  )
  const tgGroup = sessions.filter(
    (s) => s.channel_id === 'telegram' && s.platform_chat_kind === 'group',
  )
  const tgOther = sessions.filter(
    (s) =>
      s.channel_id === 'telegram' &&
      s.platform_chat_kind !== 'direct' &&
      s.platform_chat_kind !== 'group',
  )
  const otherIds = new Set(
    sessions
      .filter((s) => s.channel_id !== 'panel' && s.channel_id !== 'telegram')
      .map((s) => s.channel_id),
  )
  const groups: SessionGroup[] = []
  if (panel.length) groups.push({ id: 'panel', label: 'Panel', sessions: panel })
  if (tgDirect.length)
    groups.push({ id: 'telegram-direct', label: 'Telegram · Direct', sessions: tgDirect })
  if (tgGroup.length)
    groups.push({ id: 'telegram-group', label: 'Telegram · Groups', sessions: tgGroup })
  if (tgOther.length) groups.push({ id: 'telegram-other', label: 'Telegram', sessions: tgOther })
  for (const cid of otherIds) {
    const rows = sessions.filter((s) => s.channel_id === cid)
    if (rows.length) groups.push({ id: cid, label: channelLabel(rows[0]), sessions: rows })
  }
  return groups
}

function ChannelFilterMenu({
  channelFilter,
  channels,
  disabled,
  onSelect,
}: {
  channelFilter: string
  channels: { channel_id: string; label: string; count: number }[]
  disabled?: boolean
  onSelect: (id: string) => void
}) {
  const total = channels.reduce((n, c) => n + c.count, 0)
  const activeLabel =
    channelFilter === 'all'
      ? 'All channels'
      : (channels.find((c) => c.channel_id === channelFilter)?.label ?? channelFilter)

  return (
    <Menu.Root positioning={{ placement: 'bottom-start' }}>
      <Menu.Trigger asChild>
        <Button
          size="sm"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="input"
          className="agent-chat__channel-trigger"
          disabled={disabled}
          _open={{ bg: 'bg.panelHover' }}
        >
          <HStack gap={1} minW={0}>
            <Text fontSize="sm" fontWeight="medium" truncate maxW="7rem">
              {activeLabel}
            </Text>
            <ChevronDown size={14} strokeWidth={2} aria-hidden />
          </HStack>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner zIndex={50}>
          <Menu.Content
            minW="12rem"
            borderRadius="input"
            borderWidth="1px"
            borderColor="border.subtle"
            bg="bg.panel"
            py={1}
          >
            <Menu.Item
              value="all"
              onClick={() => onSelect('all')}
              bg={channelFilter === 'all' ? 'bg.panelHover' : undefined}
            >
              <HStack justify="space-between" w="full">
                <Text fontSize="sm">All channels</Text>
                <Text fontSize="xs" color="fg.muted">
                  {total}
                </Text>
              </HStack>
            </Menu.Item>
            {channels.map((c) => (
              <Menu.Item
                key={c.channel_id}
                value={c.channel_id}
                onClick={() => onSelect(c.channel_id)}
                bg={channelFilter === c.channel_id ? 'bg.panelHover' : undefined}
              >
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm">{c.label}</Text>
                  <Text fontSize="xs" color="fg.muted">
                    {c.count}
                  </Text>
                </HStack>
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

function SessionMenu({
  sessions,
  sessionId,
  disabled,
  modelLabel,
  onSelect,
  onNewSession,
}: {
  sessions: AgentChatSession[]
  sessionId: string | null
  disabled?: boolean
  modelLabel: string
  onSelect: (id: string) => void
  onNewSession: () => void
}) {
  const active = sessions.find((s) => s.id === sessionId)
  const groups = groupSessions(sessions)

  return (
    <Menu.Root positioning={{ placement: 'bottom-start' }}>
      <Menu.Trigger asChild>
        <Button
          size="sm"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="input"
          className="agent-chat__session-trigger"
          disabled={disabled}
          _open={{ bg: 'bg.panelHover' }}
        >
          <HStack gap={1.5} minW={0}>
            <Text as="span" fontSize="xs" aria-hidden>
              {sessionIcon(active)}
            </Text>
            <Text fontSize="sm" fontWeight="medium" truncate maxW="9rem">
              {sessionDisplayName(active)}
            </Text>
            <Text fontSize="xs" color="fg.muted" truncate maxW="5rem">
              {modelLabel}
            </Text>
            <ChevronDown size={14} strokeWidth={2} aria-hidden />
          </HStack>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner zIndex={50}>
          <Menu.Content
            minW="16rem"
            maxH="min(360px, 55vh)"
            overflowY="auto"
            className="app-scroll"
            borderRadius="input"
            borderWidth="1px"
            borderColor="border.subtle"
            bg="bg.panel"
            py={1}
          >
            <Menu.Item value="new" onClick={onNewSession}>
              <HStack gap={2}>
                <Plus size={14} aria-hidden />
                <Text fontSize="sm">New panel session</Text>
              </HStack>
            </Menu.Item>
            {groups.length ? (
              groups.map((group) => (
                <Menu.ItemGroup key={group.id}>
                  <Menu.ItemGroupLabel px={3} py={1.5} fontSize="xs" color="fg.muted">
                    {group.label}
                  </Menu.ItemGroupLabel>
                  {group.sessions.map((s) => (
                    <Menu.Item
                      key={s.id}
                      value={s.id}
                      onClick={() => onSelect(s.id)}
                      bg={s.id === sessionId ? 'bg.panelHover' : undefined}
                    >
                      <Box minW={0} w="full">
                        <HStack justify="space-between" gap={2}>
                          <Text fontSize="sm" truncate flex="1">
                            {sessionDisplayName(s)}
                          </Text>
                          <Text fontSize="xs" color="fg.muted" flexShrink={0}>
                            {formatRelativeTime(s.updated_at)}
                          </Text>
                        </HStack>
                        <Text fontSize="xs" color="fg.muted" truncate>
                          {sessionSubtitle(s)}
                        </Text>
                      </Box>
                    </Menu.Item>
                  ))}
                </Menu.ItemGroup>
              ))
            ) : (
              <Menu.Item value="empty" disabled closeOnSelect={false}>
                <Text fontSize="sm" color="fg.muted" px={2}>
                  No sessions in this channel yet
                </Text>
              </Menu.Item>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

function PromptRoleMenu({
  prompts,
  promptId,
  disabled,
  onSelect,
}: {
  prompts: GatewayPrompt[]
  promptId: string
  disabled?: boolean
  onSelect: (id: string) => void
}) {
  const active = prompts.find((p) => p.id === promptId)
  const kindLabel = active?.kind === 'role' ? 'Role' : 'Task'

  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        <Button
          size="sm"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="input"
          className="agent-chat__prompt-trigger"
          disabled={disabled || prompts.length === 0}
          _open={{ bg: 'bg.panelHover' }}
        >
          <HStack gap={1} minW={0}>
            <Text fontSize="sm" fontWeight="medium" truncate maxW="7.5rem">
              {active?.label ?? kindLabel}
            </Text>
            {active?.recommended ? (
              <Text as="span" fontSize="xs" color="fg.muted" aria-hidden>
                ★
              </Text>
            ) : null}
            <ChevronDown size={14} strokeWidth={2} aria-hidden />
          </HStack>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner zIndex={50}>
          <Menu.Content
            minW="14rem"
            maxH="min(320px, 50vh)"
            overflowY="auto"
            className="app-scroll"
            borderRadius="input"
            borderWidth="1px"
            borderColor="border.subtle"
            bg="bg.panel"
            py={1}
          >
            {prompts.length ? (
              prompts.map((p) => (
                <Menu.Item
                  key={p.id}
                  value={p.id}
                  onClick={() => onSelect(p.id)}
                  bg={p.id === promptId ? 'bg.panelHover' : undefined}
                >
                  <HStack justify="space-between" w="full" gap={2}>
                    <Box minW={0}>
                      <Text fontSize="sm" truncate>
                        {p.label}
                      </Text>
                      <Text fontSize="xs" color="fg.muted" textTransform="capitalize">
                        {p.kind ?? 'task'}
                      </Text>
                    </Box>
                    {p.recommended ? (
                      <Text fontSize="xs" color="fg.muted">
                        ★
                      </Text>
                    ) : null}
                  </HStack>
                </Menu.Item>
              ))
            ) : (
              <Menu.Item value="empty" disabled closeOnSelect={false}>
                <Text fontSize="sm" color="fg.muted">
                  No prompts loaded
                </Text>
              </Menu.Item>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

function ChatMessageRow({
  message,
  expandedToolId,
  onToggleTools,
  motionEnabled,
  transition,
}: {
  message: ChatMessage
  expandedToolId: string | null
  onToggleTools: (id: string) => void
  motionEnabled: boolean
  transition: ReturnType<typeof useMotionTransition>
}) {
  const isUser = message.role === 'user'
  const isSession = message.kind === 'session'
  const label = isUser ? 'You' : 'Assistant'

  const Row = motionEnabled ? motion.div : 'div'
  const rowMotion = motionEnabled
    ? { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition }
    : {}

  return (
    <Row className={`agent-chat__row${isUser ? ' agent-chat__row--user' : ''}`} {...rowMotion}>
      <div className="agent-chat__avatar" aria-hidden>
        {isUser ? 'U' : 'A'}
      </div>
      <div className="agent-chat__bubble-wrap">
        <div className={`agent-chat__bubble${isSession ? ' agent-chat__bubble--session' : ''}`}>
          {isSession ? (
            <>
              <span aria-hidden>✅ </span>
              {message.content}
            </>
          ) : (
            message.content
          )}
          {message.toolCalls?.length ? (
            <Box mt={2} pt={2} borderTopWidth="1px" borderColor="border.subtle">
              <button
                type="button"
                className="agent-chat__tool-toggle"
                onClick={() => onToggleTools(message.id)}
              >
                {expandedToolId === message.id
                  ? 'Hide tool trace'
                  : `Show ${message.toolCalls.length} tool call(s)`}
              </button>
              {expandedToolId === message.id ? (
                <Box mt={2}>
                  <AgentToolTrace toolCalls={message.toolCalls} />
                </Box>
              ) : null}
            </Box>
          ) : null}
        </div>
        <div className="agent-chat__meta">
          {label} {formatChatTime(message.createdAt)}
          {!isUser && message.ok === false ? (
            <Text as="span" color="red.500" ml={1}>
              · failed
            </Text>
          ) : null}
        </div>
      </div>
    </Row>
  )
}

export function AgentChatPanel() {
  const gatewayQuery = useGatewayStatusQuery()
  const promptsQuery = useGatewayPromptsQuery()
  const [channelFilter, setChannelFilter] = useState('all')
  const sessionsQuery = useAgentChatSessionsQuery({
    channelId: channelFilter === 'all' ? undefined : channelFilter,
  })
  const createSessionMutation = useCreateChatSessionMutation()
  const updateSessionMutation = useUpdateChatSessionMutation()
  const runMutation = useRunAgentMutation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const motionEnabled = useMotionEnabled()
  const transition = useMotionTransition(0.28)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [promptId, setPromptId] = useState('gateway_agent')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const runtime = gatewayQuery.data?.runtime
  const aiEnabled = runtime?.ai?.ai_enabled
  const llmReady = runtime?.ai?.llm_ready ?? false
  const canRun = Boolean(llmReady)
  const prompts: GatewayPrompt[] = promptsQuery.data?.items ?? []
  const sessions: AgentChatSession[] = sessionsQuery.data?.items ?? []
  const channelSummaries = sessionsQuery.data?.channels ?? []
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId],
  )
  const bootLoading =
    (gatewayQuery.isLoading && !gatewayQuery.data) ||
    (promptsQuery.isLoading && !promptsQuery.data) ||
    (sessionsQuery.isLoading && !sessionsQuery.data)

  const modelLabel = useMemo(() => {
    const fromRuntime = runtime?.ai?.model_ref
    if (fromRuntime) return fromRuntime
    if (runtime?.ai?.ai_provider && runtime?.ai?.ai_model) {
      return formatModelRef(runtime.ai.ai_provider, runtime.ai.ai_model)
    }
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.model)
    return lastAssistant?.model ?? 'gateway'
  }, [runtime?.ai?.model_ref, runtime?.ai?.ai_provider, runtime?.ai?.ai_model, messages])

  const applySession = useCallback((session: AgentChatSession) => {
    setSessionId(session.id)
    setPromptId(session.prompt_id)
    setMessages(sessionMessagesToUi(session))
    setExpandedToolId(null)
  }, [])

  useEffect(() => {
    if (sessionsQuery.isLoading) return
    const items = sessionsQuery.data?.items ?? []
    if (sessionId && items.some((s) => s.id === sessionId)) return
    if (items.length > 0) {
      applySession(items[0])
      return
    }
    if (channelFilter !== 'all') return
    if (createSessionMutation.isPending) return
    void createSessionMutation.mutateAsync({ prompt_id: 'gateway_agent' }).then(applySession)
  }, [
    applySession,
    channelFilter,
    createSessionMutation,
    sessionId,
    sessionsQuery.data,
    sessionsQuery.isLoading,
  ])

  function handleChannelFilter(next: string) {
    setChannelFilter(next)
    setSessionId(null)
    setMessages([])
  }

  useEffect(() => {
    if (!activeSession || runMutation.isPending) return
    setMessages(sessionMessagesToUi(activeSession))
  }, [activeSession?.updated_at, activeSession?.id, runMutation.isPending, activeSession])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: motionEnabled ? 'smooth' : 'auto' })
  }, [messages, runMutation.isPending, motionEnabled])

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen])

  async function handleNewSession() {
    const session = await createSessionMutation.mutateAsync({ prompt_id: promptId })
    applySession(session)
    setInput('')
  }

  function handleSelectSession(id: string) {
    const session = sessions.find((s) => s.id === id)
    if (session) applySession(session)
  }

  async function handlePromptChange(id: string) {
    setPromptId(id)
    if (!sessionId) return
    await updateSessionMutation.mutateAsync({ id: sessionId, prompt_id: id })
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || !canRun || runMutation.isPending || !sessionId) return
    setInput('')
    setMessages((prev) => [
      ...prev,
      { id: nextMessageId(), role: 'user', content: text, createdAt: new Date() },
    ])
    try {
      const result = await runMutation.mutateAsync({
        message: text,
        prompt_id: promptId,
        session_id: sessionId,
      })
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          role: 'assistant',
          content: result.message,
          createdAt: new Date(),
          toolCalls: result.tool_calls,
          promptId: result.prompt_id ?? promptId,
          model: result.model_ref ?? result.model,
          ok: result.ok,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          role: 'assistant',
          content: String((err as Error).message || err),
          createdAt: new Date(),
          ok: false,
        },
      ])
    }
  }

  const chatShell = (
    <>
      <header className="agent-chat__header">
        <Box minW={0}>
          <h2 className="agent-chat__title">Chat</h2>
          <p className="agent-chat__subtitle">
            Panel and bot platform sessions stay in sync — Telegram chats appear here automatically.
          </p>
        </Box>

        <div className="agent-chat__toolbar">
          <ChannelFilterMenu
            channelFilter={channelFilter}
            channels={channelSummaries}
            disabled={sessionsQuery.isLoading}
            onSelect={handleChannelFilter}
          />

          <SessionMenu
            sessions={sessions}
            sessionId={sessionId}
            modelLabel={modelLabel}
            disabled={sessionsQuery.isLoading || createSessionMutation.isPending}
            onSelect={handleSelectSession}
            onNewSession={() => void handleNewSession()}
          />

          <PromptRoleMenu
            prompts={prompts}
            promptId={promptId}
            disabled={promptsQuery.isLoading || updateSessionMutation.isPending}
            onSelect={(id) => void handlePromptChange(id)}
          />

          <IconButton
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            aria-label="Refresh chat and gateway status"
            loading={sessionsQuery.isFetching || gatewayQuery.isFetching}
            onClick={() => {
              void sessionsQuery.refetch()
              void gatewayQuery.refetch()
            }}
          >
            <RefreshCw size={16} />
          </IconButton>

          <span className="agent-chat__vdivider" aria-hidden />

          {canRun ? (
            <IconButton
              size="sm"
              variant="solid"
              colorPalette="green"
              borderRadius="input"
              aria-label="AI ready"
            >
              <Brain size={16} />
            </IconButton>
          ) : (
            <IconButton
              asChild
              size="sm"
              variant="solid"
              colorPalette="red"
              borderRadius="input"
              aria-label="Configure AI"
            >
              <RouterLink to="/settings/ai">
                <Brain size={16} />
              </RouterLink>
            </IconButton>
          )}

          <IconButton
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen chat'}
            onClick={() => setFullscreen((v) => !v)}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </IconButton>
        </div>
      </header>

      {!canRun ? (
        <Box
          px={5}
          py={3}
          borderBottomWidth="1px"
          borderColor="orange.200"
          bg="orange.subtle"
          display="flex"
          gap={2}
          alignItems="flex-start"
          flexShrink={0}
        >
          <Box color="orange.fg" pt={0.5}>
            <AlertCircle size={16} />
          </Box>
          <Text fontSize="sm" color="fg.muted">
            {!aiEnabled
              ? 'Gateway agent LLM is disabled. Enable it under '
              : 'LLM is not ready — pick a provider, model, and API key (or use local Ollama) under '}
            <RouterLink to="/settings/ai" style={{ color: 'var(--app-accent)' }}>
              Settings → Agent LLM
            </RouterLink>
            {!aiEnabled ? ' before using the gateway agent.' : '.'}
          </Text>
        </Box>
      ) : null}

      {activeSession && activeSession.channel_id !== 'panel' ? (
        <Box
          px={5}
          py={2}
          borderBottomWidth="1px"
          borderColor="border.subtle"
          bg="bg.subtle"
          flexShrink={0}
        >
          <Text fontSize="xs" color="fg.muted">
            {channelLabel(activeSession)} · {platformKindLabel(activeSession.platform_chat_kind)}
            {' · '}
            {sessionDisplayName(activeSession)}
            {activeSession.platform_chat_id ? ` · ${activeSession.platform_chat_id}` : ''}
            {' · '}
            {activeSession.message_count ?? 0} messages · synced from bot
          </Text>
        </Box>
      ) : null}

      <div ref={scrollRef} className="agent-chat__scroll app-scroll">
        {messages.length === 0 && !runMutation.isPending ? (
          <div className="agent-chat__empty">
            Pick a role and send a message — scrape URLs, check catalog health, preview exports.
            History is kept per session on the gateway.
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <ChatMessageRow
                key={m.id}
                message={m}
                expandedToolId={expandedToolId}
                motionEnabled={motionEnabled}
                transition={transition}
                onToggleTools={(id) => setExpandedToolId(expandedToolId === id ? null : id)}
              />
            ))}
            {runMutation.isPending ? (
              <motion.div
                className="agent-chat__row"
                initial={motionEnabled ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={transition}
              >
                <div className="agent-chat__avatar" aria-hidden>
                  A
                </div>
                <div className="agent-chat__bubble-wrap">
                  <div className="agent-chat__thinking">Thinking…</div>
                  <div className="agent-chat__meta">Assistant {formatChatTime(new Date())}</div>
                </div>
              </motion.div>
            ) : null}
          </>
        )}
      </div>

      <footer className="agent-chat__footer">
        <div className="agent-chat__compose">
          <textarea
            className="agent-chat__input"
            rows={2}
            value={input}
            disabled={!canRun || runMutation.isPending || !sessionId}
            placeholder={
              canRun
                ? 'Message (⏎ to send, Shift+⏎ for line breaks)'
                : 'Enable AI and configure API key to chat'
            }
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
          />
          <div className="agent-chat__actions">
            <button
              type="button"
              className="agent-chat__btn-ghost"
              disabled={runMutation.isPending || createSessionMutation.isPending}
              onClick={() => void handleNewSession()}
            >
              New session
            </button>
            <button
              type="button"
              className="agent-chat__btn-send"
              disabled={!canRun || !input.trim() || runMutation.isPending || !sessionId}
              onClick={() => void handleSend()}
            >
              Send
              <Check size={16} strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        </div>
        {gatewayQuery.data ? (
          <Text mt={2} fontSize="xs" color="fg.subtle">
            {gatewayQuery.data.tools_count} tools · {gatewayQuery.data.workflows_count} workflows
            {activeSession
              ? ` · ${sessionDisplayName(activeSession)}${activeSession.platform_chat_id ? ` (${activeSession.platform_chat_id})` : ''}`
              : ''}
          </Text>
        ) : null}
      </footer>
    </>
  )

  return (
    <>
      {bootLoading ? (
        <Box className="agent-chat" flex="1 1 auto" minH={0} h="100%" p={{ base: 3, md: 4 }}>
          <ChatPanelSkeleton />
        </Box>
      ) : (
        <>
          <AnimatePresence>
            {fullscreen ? (
              <Portal>
                <MotionBox
                  key="agent-chat-backdrop"
                  className="agent-chat-backdrop"
                  initial={motionEnabled ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  exit={motionEnabled ? { opacity: 0 } : undefined}
                  transition={transition}
                  onClick={() => setFullscreen(false)}
                  aria-hidden
                />
              </Portal>
            ) : null}
          </AnimatePresence>

          {fullscreen ? <Box className="agent-chat-placeholder" aria-hidden /> : null}

          <MotionBox
            className="agent-chat"
            data-fullscreen={fullscreen ? '' : undefined}
            role="region"
            aria-label="Gateway agent chat"
            layout={motionEnabled && !fullscreen}
            flex="1 1 auto"
            minH={0}
            h={fullscreen ? '100dvh' : '100%'}
            maxH={fullscreen ? '100dvh' : '100%'}
            position={fullscreen ? 'fixed' : 'relative'}
            top={fullscreen ? 0 : undefined}
            left={fullscreen ? 0 : undefined}
            right={fullscreen ? 0 : undefined}
            bottom={fullscreen ? 0 : undefined}
            zIndex={fullscreen ? 40 : undefined}
            transition={transition}
          >
            {chatShell}
          </MotionBox>
        </>
      )}
    </>
  )
}
