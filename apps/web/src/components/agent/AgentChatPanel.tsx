import { Box, Button, HStack, IconButton, Menu, Portal, Text } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  Brain,
  Check,
  ChevronDown,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useGatewayPromptsQuery, useGatewayStatusQuery, useRunAgentMutation } from '../../hooks'
import { formatModelRef } from '../../config/llm-providers'
import { useMotionEnabled, useMotionTransition } from '../../hooks/use-motion-props'
import { AgentToolTrace } from './AgentToolTrace'
import type { GatewayAgentResponse, GatewayPrompt } from '../../lib/api'

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
              {active?.label ?? 'Role'}
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
                    <Text fontSize="sm" truncate>
                      {p.label}
                    </Text>
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
        <div
          className={`agent-chat__bubble${isSession ? ' agent-chat__bubble--session' : ''}`}
        >
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
  const runMutation = useRunAgentMutation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const motionEnabled = useMotionEnabled()
  const transition = useMotionTransition(0.28)

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
  const activePrompt = prompts.find((p) => p.id === promptId)

  const modelLabel = useMemo(() => {
    const fromRuntime = runtime?.ai?.model_ref
    if (fromRuntime) return fromRuntime
    if (runtime?.ai?.ai_provider && runtime?.ai?.ai_model) {
      return formatModelRef(runtime.ai.ai_provider, runtime.ai.ai_model)
    }
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.model)
    return lastAssistant?.model ?? 'gateway'
  }, [runtime?.ai?.model_ref, runtime?.ai?.ai_provider, runtime?.ai?.ai_model, messages])

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

  function startNewSession() {
    const promptLabel = activePrompt?.label ?? promptId
    setMessages([
      {
        id: nextMessageId(),
        role: 'assistant',
        kind: 'session',
        content: `New session started · model: ${modelLabel} · ${promptLabel}`,
        createdAt: new Date(),
        ok: true,
      },
    ])
    setExpandedToolId(null)
    setInput('')
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || !canRun || runMutation.isPending) return
    setInput('')
    setMessages((prev) => [
      ...prev,
      { id: nextMessageId(), role: 'user', content: text, createdAt: new Date() },
    ])
    try {
      const result = await runMutation.mutateAsync({ message: text, prompt_id: promptId })
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
            Direct gateway chat session for quick interventions.
          </p>
        </Box>

        <div className="agent-chat__toolbar">
          <PromptRoleMenu
            prompts={prompts}
            promptId={promptId}
            disabled={promptsQuery.isLoading}
            onSelect={setPromptId}
          />

          <IconButton
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            aria-label="Refresh gateway status"
            loading={gatewayQuery.isFetching}
            onClick={() => void gatewayQuery.refetch()}
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
              ? 'AI is disabled. Enable it under '
              : 'LLM is not ready — pick a provider, set a model ref, and add an API key (or use local Ollama) under '}
            <RouterLink to="/settings/ai" style={{ color: 'var(--app-accent)' }}>
              Settings → AI & LLM
            </RouterLink>
            {!aiEnabled ? ' before using the gateway agent.' : '.'}
          </Text>
        </Box>
      ) : null}

      <div ref={scrollRef} className="agent-chat__scroll app-scroll">
        {messages.length === 0 && !runMutation.isPending ? (
          <div className="agent-chat__empty">
            Start a session or send a message — scrape URLs, check catalog health, preview exports.
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
            disabled={!canRun || runMutation.isPending}
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
              disabled={runMutation.isPending}
              onClick={startNewSession}
            >
              New session
            </button>
            <button
              type="button"
              className="agent-chat__btn-send"
              disabled={!canRun || !input.trim() || runMutation.isPending}
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
          </Text>
        ) : null}
      </footer>
    </>
  )

  return (
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
  )
}
