import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useLocale } from '../../hooks/use-locale'
import type { DatabaseQueryResponse, DatabaseQuerySuggestion } from '../../lib/api'

export type QueryLogEntry = {
  id: string
  at: string
  sql: string
  ok: boolean
  message: string
  row_count?: number
  elapsed_ms?: number | null
}

export function QueryStatusBanner({ result }: { result: DatabaseQueryResponse | null }) {
  const { t } = useLocale()
  if (!result?.message) return null
  const ok = result.ok !== false
  return (
    <HStack
      gap={2}
      px={3}
      py={2}
      borderRadius="var(--radius-input)"
      borderWidth="1px"
      borderColor={ok ? 'green.500' : 'red.500'}
      bg={ok ? 'green.subtle' : 'red.subtle'}
      fontSize="sm"
      align="flex-start"
    >
      {ok ? (
        <CheckCircle2 size={16} color="var(--chakra-colors-green-500)" />
      ) : (
        <XCircle size={16} color="var(--chakra-colors-red-500)" />
      )}
      <Box minW={0}>
        <Text fontWeight="medium">
          {ok ? t('db.tools.querySuccess') : t('db.tools.queryError')}
        </Text>
        <Text fontSize="xs" color="fg.muted" fontFamily="mono" wordBreak="break-all">
          {result.message}
        </Text>
        {result.sql_executed ? (
          <Text fontSize="xs" color="fg.muted" mt={1} fontFamily="mono" lineClamp={2}>
            {result.sql_executed}
          </Text>
        ) : null}
      </Box>
    </HStack>
  )
}

export function QuerySuggestions({
  items,
  onPick,
}: {
  items: DatabaseQuerySuggestion[]
  onPick: (sql: string) => void
}) {
  const { t } = useLocale()
  if (!items.length) return null
  return (
    <Box>
      <Text fontSize="xs" color="fg.muted" mb={1.5}>
        {t('db.tools.suggestionsTitle')}
      </Text>
      <HStack gap={1.5} flexWrap="wrap">
        {items.map((item) => (
          <Button
            key={`${item.label}-${item.sql}`}
            size="xs"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="full"
            fontWeight="normal"
            fontFamily="mono"
            onClick={() => onPick(item.sql)}
          >
            {item.label}
          </Button>
        ))}
      </HStack>
    </Box>
  )
}

export function SyntaxHints({ hints }: { hints: string[] }) {
  const { t } = useLocale()
  if (!hints.length) return null
  return (
    <Box>
      <Text fontSize="xs" color="fg.muted" mb={1}>
        {t('db.tools.syntaxTitle')}
      </Text>
      <VStack align="stretch" gap={0.5}>
        {hints.map((line) => (
          <Text key={line} fontSize="xs" fontFamily="mono" color="fg.muted">
            {line}
          </Text>
        ))}
      </VStack>
    </Box>
  )
}

export function QueryLogPanel({
  entries,
  onClear,
}: {
  entries: QueryLogEntry[]
  onClear: () => void
}) {
  const { t } = useLocale()
  if (!entries.length) return null
  return (
    <Box borderTopWidth="1px" borderColor="border.subtle" pt={3}>
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" fontWeight="medium">
          {t('db.tools.logTitle')}
        </Text>
        <Button size="xs" variant="ghost" onClick={onClear}>
          {t('db.tools.logClear')}
        </Button>
      </HStack>
      <VStack align="stretch" gap={1} maxH="140px" overflow="auto" className="app-scroll">
        {entries.map((entry) => (
          <Box
            key={entry.id}
            px={2}
            py={1.5}
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="var(--radius-input)"
            bg="bg.elevated"
            fontSize="xs"
          >
            <HStack justify="space-between" gap={2}>
              <Text color={entry.ok ? 'green.500' : 'red.500'} fontWeight="medium">
                {entry.ok ? t('db.tools.logOk') : t('db.tools.logFail')}
              </Text>
              <Text color="fg.muted">{entry.at}</Text>
            </HStack>
            <Text fontFamily="mono" lineClamp={1} color="fg.muted" mt={0.5}>
              {entry.sql}
            </Text>
            <Text mt={0.5}>{entry.message}</Text>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}
