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
import { useState } from 'react'
import { fieldStyles } from '../ui/field-styles'
import { AgentToolTrace } from './AgentToolTrace'
import type { GatewayAgentResponse, GatewayPrompt } from '../../lib/api'
import { useGatewayPromptsQuery, useRunAgentMutation } from '../../hooks'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: GatewayAgentResponse['tool_calls']
  promptId?: string
}

export function AgentChatPanel() {
  const promptsQuery = useGatewayPromptsQuery()
  const runMutation = useRunAgentMutation()
  const [promptId, setPromptId] = useState('gateway_agent')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [lastTools, setLastTools] = useState<GatewayAgentResponse['tool_calls']>([])

  const prompts: GatewayPrompt[] = promptsQuery.data?.items ?? []

  async function handleSend() {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    try {
      const result = await runMutation.mutateAsync({ message: text, prompt_id: promptId })
      setLastTools(result.tool_calls ?? [])
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.message,
          toolCalls: result.tool_calls,
          promptId: result.prompt_id ?? promptId,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: String((err as Error).message || err) },
      ])
    }
  }

  return (
    <VStack align="stretch" gap={4} h="full">
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
        flex={1}
        minH="240px"
        maxH="360px"
        overflowY="auto"
        p={3}
        borderRadius="input"
        borderWidth="1px"
        borderColor="border.subtle"
        bg="bg.subtle"
      >
        {messages.length === 0 ? (
          <Text fontSize="sm" color="fg.muted">
            Ask the gateway agent to scrape URLs, check catalog health, or preview exports.
          </Text>
        ) : (
          <VStack align="stretch" gap={3}>
            {messages.map((m, i) => (
              <Box
                key={i}
                alignSelf={m.role === 'user' ? 'flex-end' : 'flex-start'}
                maxW="90%"
                p={2}
                borderRadius="input"
                bg={m.role === 'user' ? 'blue.subtle' : 'bg.input'}
                borderWidth="1px"
                borderColor="border.subtle"
              >
                <Text fontSize="xs" color="fg.muted" mb={1}>
                  {m.role === 'user' ? 'You' : `Agent${m.promptId ? ` · ${m.promptId}` : ''}`}
                </Text>
                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {m.content}
                </Text>
              </Box>
            ))}
          </VStack>
        )}
      </Box>

      <Textarea
        {...fieldStyles}
        rows={3}
        value={input}
        placeholder="e.g. List marketplaces and last 5 products"
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
          colorPalette="blue"
          borderRadius="input"
          loading={runMutation.isPending}
          onClick={() => void handleSend()}
        >
          Send
        </Button>
      </HStack>

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={2}>
          Tool trace
        </Text>
        <AgentToolTrace toolCalls={lastTools} />
      </Box>
    </VStack>
  )
}
