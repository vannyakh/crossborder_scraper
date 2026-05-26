import {
  Box,
  Button,
  Field,
  HStack,
  NativeSelect,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useGatewayPromptsQuery, useGatewayStatusQuery, useRunAgentMutation } from '../../hooks'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { fieldStyles } from '../ui/field-styles'
import { Section, SectionCard } from '../ui/Section'
import { AgentToolTrace } from './AgentToolTrace'
import type { GatewayAgentResponse, GatewayPrompt } from '../../lib/api'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
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

export function AgentChatPanel() {
  const accentPalette = useAccentPalette()
  const gatewayQuery = useGatewayStatusQuery()
  const promptsQuery = useGatewayPromptsQuery()
  const runMutation = useRunAgentMutation()
  const [promptId, setPromptId] = useState('gateway_agent')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null)

  const runtime = gatewayQuery.data?.runtime
  const aiEnabled = runtime?.ai?.ai_enabled
  const canRun = Boolean(aiEnabled && runtime?.ai?.ai_api_key_set)
  const prompts: GatewayPrompt[] = promptsQuery.data?.items ?? []

  async function handleSend() {
    const text = input.trim()
    if (!text || !canRun) return
    setInput('')
    setMessages((prev) => [...prev, { id: nextMessageId(), role: 'user', content: text }])
    try {
      const result = await runMutation.mutateAsync({ message: text, prompt_id: promptId })
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          role: 'assistant',
          content: result.message,
          toolCalls: result.tool_calls,
          promptId: result.prompt_id ?? promptId,
          model: result.model,
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
          ok: false,
        },
      ])
    }
  }

  return (
    <Section title="Agent chat" description="Prompts from libs/prompts — tool trace per response" mt={0}>
      {!aiEnabled ? (
        <SectionCard mb={4} borderColor="orange.200" bg="orange.subtle">
          <HStack align="flex-start" gap={2}>
            <Box color="orange.fg" pt={0.5}>
              <AlertCircle size={16} />
            </Box>
            <Text fontSize="sm" color="fg.muted">
              AI is disabled. Enable it under{' '}
              <RouterLink to="/settings/ai" style={{ color: 'var(--app-accent)' }}>
                Settings → AI & LLM
              </RouterLink>{' '}
              before using the gateway agent.
            </Text>
          </HStack>
        </SectionCard>
      ) : null}

      <SectionCard>
        <VStack align="stretch" gap={4}>
          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted">
              System prompt (libs/prompts)
            </Field.Label>
            <NativeSelect.Root {...fieldStyles} size="sm">
              <NativeSelect.Field
                value={promptId}
                onChange={(e) => setPromptId(e.target.value)}
              >
                {prompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {p.recommended ? ' ★' : ''}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Field.Root>

          <Box
            minH="280px"
            maxH="420px"
            overflowY="auto"
            p={3}
            borderRadius="input"
            borderWidth="1px"
            borderColor="border.subtle"
            bg="bg.subtle"
            className="app-scroll"
          >
            {messages.length === 0 ? (
              <Text fontSize="sm" color="fg.muted">
                Ask the gateway agent to scrape URLs, check catalog health, or preview exports.
              </Text>
            ) : (
              <VStack align="stretch" gap={3}>
                {messages.map((m) => (
                  <Box
                    key={m.id}
                    alignSelf={m.role === 'user' ? 'flex-end' : 'flex-start'}
                    maxW="92%"
                    p={3}
                    borderRadius="input"
                    bg={m.role === 'user' ? 'colorPalette.subtle' : 'bg.input'}
                    colorPalette={m.role === 'user' ? accentPalette : undefined}
                    borderWidth="1px"
                    borderColor="border.subtle"
                  >
                    <HStack justify="space-between" gap={2} mb={1} flexWrap="wrap">
                      <Text fontSize="xs" color="fg.muted">
                        {m.role === 'user'
                          ? 'You'
                          : `Agent${m.promptId ? ` · ${m.promptId}` : ''}${m.model ? ` · ${m.model}` : ''}`}
                      </Text>
                      {m.role === 'assistant' && m.ok === false ? (
                        <Text fontSize="xs" color="red.500">
                          failed
                        </Text>
                      ) : null}
                    </HStack>
                    <Text fontSize="sm" whiteSpace="pre-wrap">
                      {m.content}
                    </Text>
                    {m.toolCalls?.length ? (
                      <Box mt={2} pt={2} borderTopWidth="1px" borderColor="border.subtle">
                        <button
                          type="button"
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--app-accent)',
                            cursor: 'pointer',
                            marginBottom: expandedToolId === m.id ? '0.5rem' : 0,
                            background: 'none',
                            border: 'none',
                            padding: 0,
                          }}
                          onClick={() =>
                            setExpandedToolId(expandedToolId === m.id ? null : m.id)
                          }
                        >
                          {expandedToolId === m.id
                            ? 'Hide tool trace'
                            : `Show ${m.toolCalls.length} tool call(s)`}
                        </button>
                        {expandedToolId === m.id ? (
                          <AgentToolTrace toolCalls={m.toolCalls} />
                        ) : null}
                      </Box>
                    ) : null}
                  </Box>
                ))}
              </VStack>
            )}
          </Box>

          <Textarea
            {...fieldStyles}
            rows={3}
            value={input}
            disabled={!canRun}
            placeholder={
              canRun
                ? 'e.g. List marketplaces and last 5 products'
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

          <HStack>
            <Button
              size="sm"
              colorPalette={accentPalette}
              borderRadius="input"
              loading={runMutation.isPending}
              disabled={!canRun}
              onClick={() => void handleSend()}
            >
              Send
            </Button>
            {gatewayQuery.data ? (
              <Text fontSize="xs" color="fg.muted">
                {gatewayQuery.data.tools_count} tools · {gatewayQuery.data.workflows_count} workflows
              </Text>
            ) : null}
          </HStack>
        </VStack>
      </SectionCard>
    </Section>
  )
}
