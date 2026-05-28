import { Box, HStack, IconButton, Input, Text, VStack } from '@chakra-ui/react'
import { KeyRound, Play, Type } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDatabaseSqlCompleteQuery } from '../../hooks/queries/use-database-engine-query'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { fieldStyles } from '../ui/field-styles'

function sqlTokenPrefix(sql: string): string {
  const trimmed = sql.trimEnd()
  const match = trimmed.match(/(\S+)$/)
  return match?.[1] ?? ''
}

export function SqlQueryBar({
  value,
  disabled,
  loading,
  pluginId,
  databaseName,
  tableName,
  onChange,
  onRun,
  onApplyCompletion,
}: {
  value: string
  disabled?: boolean
  loading?: boolean
  pluginId: string
  databaseName: string
  tableName?: string | null
  onChange: (sql: string) => void
  onRun: () => void
  onApplyCompletion: (nextSql: string) => void
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const prefix = useMemo(() => sqlTokenPrefix(value), [value])
  const completeQuery = useDatabaseSqlCompleteQuery(
    pluginId,
    databaseName,
    prefix,
    tableName,
    open && prefix.length > 0,
  )

  const items = useMemo(() => {
    const data = completeQuery.data
    if (!data) return []
    const out: { kind: 'keyword' | 'type' | 'id'; label: string }[] = []
    for (const k of data.keywords) out.push({ kind: 'keyword', label: k })
    for (const ty of data.types) out.push({ kind: 'type', label: ty })
    for (const id of data.identifiers) out.push({ kind: 'id', label: id })
    return out.slice(0, 48)
  }, [completeQuery.data])

  useEffect(() => {
    setActiveIdx(0)
  }, [prefix, items.length])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const applyItem = (label: string) => {
    const trimmed = value.trimEnd()
    const match = trimmed.match(/^(.*\s)?(\S+)$/)
    const head = match?.[1] ?? ''
    const next = `${head}${label} `
    onApplyCompletion(next)
    setOpen(false)
  }

  const showMenu = open && items.length > 0 && prefix.length > 0

  return (
    <Box ref={wrapRef} position="relative" w="full">
      <HStack
        gap={2}
        p={2}
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-input)"
        bg="bg.elevated"
      >
        <Input
          {...fieldStyles}
          flex={1}
          size="sm"
          fontFamily="mono"
          fontSize="xs"
          value={value}
          disabled={disabled}
          placeholder={t('db.tools.sqlPlaceholder')}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (showMenu) {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIdx((i) => Math.min(i + 1, items.length - 1))
                return
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIdx((i) => Math.max(i - 1, 0))
                return
              }
              if (e.key === 'Tab' || (e.key === 'Enter' && e.shiftKey)) {
                e.preventDefault()
                const pick = items[activeIdx]
                if (pick) applyItem(pick.label)
                return
              }
              if (e.key === 'Escape') {
                setOpen(false)
                return
              }
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              setOpen(false)
              onRun()
            }
          }}
        />
        <IconButton
          size="sm"
          aria-label={t('db.config.queryRun')}
          colorPalette={accentPalette}
          loading={loading}
          disabled={disabled}
          onClick={onRun}
        >
          <Play size={14} />
        </IconButton>
      </HStack>

      {showMenu ? (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          zIndex={20}
          maxH="220px"
          overflowY="auto"
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="var(--radius-input)"
          bg="bg.panel"
          boxShadow="md"
        >
          <VStack align="stretch" gap={0} py={1}>
            {items.map((item, idx) => (
              <HStack
                key={`${item.kind}-${item.label}`}
                gap={2}
                px={3}
                py={1.5}
                cursor="pointer"
                bg={idx === activeIdx ? 'bg.panelHover' : undefined}
                _hover={{ bg: 'bg.panelHover' }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  applyItem(item.label)
                }}
              >
                <Box
                  color={
                    item.kind === 'keyword'
                      ? 'yellow.400'
                      : item.kind === 'type'
                        ? 'blue.400'
                        : 'fg.muted'
                  }
                >
                  {item.kind === 'type' ? <Type size={12} /> : <KeyRound size={12} />}
                </Box>
                <Text fontFamily="mono" fontSize="xs">
                  {item.label}
                </Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      ) : null}
    </Box>
  )
}
