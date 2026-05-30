import { Box, Button, HStack, IconButton, Input, Text, VStack } from '@chakra-ui/react'
import { Tooltip } from '@/components/ui/tooltip'
import { ChevronDown, ChevronUp, Pause, Play, Terminal, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { formatFlowConsoleTime, type FlowConsoleLevel } from './project-flow-console'
import { useFlowConsole } from './use-flow-console'

const LEVEL_CLASS: Record<FlowConsoleLevel, string> = {
  info: 'project-flow-console__line--info',
  warn: 'project-flow-console__line--warn',
  error: 'project-flow-console__line--error',
  debug: 'project-flow-console__line--debug',
  success: 'project-flow-console__line--success',
}

function levelLabelKey(level: FlowConsoleLevel): string {
  return `projects.flowConsole.level.${level}`
}

function ConsoleHeaderIcon({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: LucideIcon
  onClick: () => void
}) {
  return (
    <Tooltip content={label} positioning={{ placement: 'top' }} openDelay={200} showArrow>
      <IconButton
        className="project-flow-console__icon-btn"
        aria-label={label}
        size="xs"
        variant="ghost"
        onClick={onClick}
      >
        <Icon size={14} strokeWidth={1.75} />
      </IconButton>
    </Tooltip>
  )
}

/** Log panel body — rendered inside the bottom Splitter panel. */
export function ProjectFlowConsole() {
  const { t } = useLocale()
  const {
    lines,
    expanded,
    autoScroll,
    filterNodeId,
    clearConsole,
    expandConsole,
    minimizeConsole,
    setAutoScroll,
    setFilterNodeId,
  } = useFlowConsole()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')

  const visibleLines = useMemo(() => {
    let rows = lines
    if (filterNodeId) {
      rows = rows.filter((line) => line.nodeId === filterNodeId)
    }
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (line) =>
        line.message.toLowerCase().includes(q) ||
        line.nodeLabel?.toLowerCase().includes(q) ||
        line.level.includes(q),
    )
  }, [filterNodeId, lines, query])

  useEffect(() => {
    if (!expanded || !autoScroll) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [autoScroll, expanded, visibleLines.length])

  return (
    <Box
      className="project-flow-console"
      data-minimized={expanded ? undefined : ''}
      role="log"
      aria-live="polite"
      aria-label={t('projects.flowConsole.title')}
    >
      <HStack
        className="project-flow-console__header"
        justify="space-between"
        gap={2}
        cursor={expanded ? undefined : 'pointer'}
        onClick={expanded ? undefined : () => expandConsole()}
      >
        <HStack gap={2} minW={0}>
          <Terminal size={16} strokeWidth={1.75} />
          <Text fontSize="sm" fontWeight="semibold">
            {t('projects.flowConsole.title')}
          </Text>
          <Text fontSize="xs" color="fg.muted" fontFamily="mono">
            {visibleLines.length}
            {filterNodeId ? ` · ${t('projects.flowConsole.filtered')}` : ''}
          </Text>
        </HStack>

        <HStack gap={0.5} flexShrink={0} onClick={(event) => event.stopPropagation()}>
          {expanded ? (
            <>
              <Input
                className="project-flow-console__search"
                size="xs"
                variant="outline"
                placeholder={t('projects.flowConsole.searchPlaceholder')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <ConsoleHeaderIcon
                label={
                  autoScroll
                    ? t('projects.flowConsole.pauseScroll')
                    : t('projects.flowConsole.resumeScroll')
                }
                icon={autoScroll ? Pause : Play}
                onClick={() => setAutoScroll(!autoScroll)}
              />
              <ConsoleHeaderIcon
                label={t('projects.flowConsole.clear')}
                icon={Trash2}
                onClick={clearConsole}
              />
              <ConsoleHeaderIcon
                label={t('projects.flowConsole.minimize')}
                icon={ChevronDown}
                onClick={() => minimizeConsole()}
              />
            </>
          ) : (
            <ConsoleHeaderIcon
              label={t('projects.flowConsole.expand')}
              icon={ChevronUp}
              onClick={() => expandConsole()}
            />
          )}
        </HStack>
      </HStack>

      {expanded ? (
        <Box ref={scrollRef} className="project-flow-console__body app-scroll">
          {visibleLines.length === 0 ? (
            <Text className="project-flow-console__empty" fontSize="xs" color="fg.muted">
              {lines.length === 0
                ? t('projects.flowConsole.empty')
                : t('projects.flowConsole.emptyFilter')}
            </Text>
          ) : (
            <VStack align="stretch" gap={0} className="project-flow-console__lines">
              {visibleLines.map((line) => (
                <HStack
                  key={line.id}
                  className={`project-flow-console__line ${LEVEL_CLASS[line.level]}`}
                  align="flex-start"
                  gap={2}
                >
                  <Text className="project-flow-console__time" fontFamily="mono" fontSize="xs">
                    {formatFlowConsoleTime(line.at)}
                  </Text>
                  <Text className="project-flow-console__level" fontFamily="mono" fontSize="xs">
                    {t(levelLabelKey(line.level))}
                  </Text>
                  {line.nodeLabel ? (
                    <Text className="project-flow-console__node" fontFamily="mono" fontSize="xs">
                      {line.nodeLabel}
                    </Text>
                  ) : null}
                  <Text className="project-flow-console__message" fontSize="xs" flex={1}>
                    {line.message}
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}
        </Box>
      ) : null}

      {expanded && filterNodeId ? (
        <HStack className="project-flow-console__footer" px={3} py={1.5} gap={2}>
          <Text fontSize="xs" color="fg.muted">
            {t('projects.flowConsole.nodeFilterActive')}
          </Text>
          <Button size="xs" variant="ghost" onClick={() => setFilterNodeId(null)}>
            {t('projects.flowConsole.clearFilter')}
          </Button>
        </HStack>
      ) : null}
    </Box>
  )
}
