import { Box, Code, Text, VStack } from '@chakra-ui/react'
import type { GatewayToolCall } from '../../lib/api'
import { StatusBadge } from '../ui/StatusBadge'

type Props = {
  toolCalls: GatewayToolCall[]
}

export function AgentToolTrace({ toolCalls }: Props) {
  if (!toolCalls.length) {
    return (
      <Text fontSize="sm" color="fg.muted">
        Tool trace appears here after the agent calls scrape, export, or status tools.
      </Text>
    )
  }

  return (
    <VStack align="stretch" gap={2}>
      {toolCalls.map((call, i) => (
        <Box
          key={`${call.name}-${i}`}
          p={3}
          borderRadius="input"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.input"
          fontSize="xs"
        >
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <StatusBadge
              status={call.outcome?.ok ? 'success' : 'danger'}
              label={call.name}
            />
          </Box>
          <Text color="fg.muted" mb={1}>
            Args
          </Text>
          <Code display="block" whiteSpace="pre-wrap" p={2} borderRadius="sm" fontSize="xs">
            {JSON.stringify(call.arguments, null, 2)}
          </Code>
          <Text color="fg.muted" mt={2} mb={1}>
            Result
          </Text>
          <Code display="block" whiteSpace="pre-wrap" p={2} borderRadius="sm" fontSize="xs" maxH="160px" overflowY="auto">
            {JSON.stringify(call.outcome, null, 2)}
          </Code>
        </Box>
      ))}
    </VStack>
  )
}
