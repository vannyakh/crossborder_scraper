import { useCallback, useMemo, useState, type ReactNode } from 'react'

import {
  createFlowConsoleLine,
  type FlowConsoleLine,
  type FlowConsoleLevel,
} from './project-flow-console'
import {
  clampExpandedLogPct,
  FLOW_CONSOLE_DEFAULT_EXPANDED_PCT,
} from './project-flow-console-layout'
import { FlowConsoleContext } from './project-flow-console-context-value'
import type { FlowConsoleContextValue } from './project-flow-console-context.types'

export type {
  FlowConsoleActions,
  FlowConsoleContextValue,
  FlowConsoleState,
} from './project-flow-console-context.types'

export function ProjectFlowConsoleProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<FlowConsoleLine[]>([])
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [expandedLogPct, setExpandedLogPctState] = useState(FLOW_CONSOLE_DEFAULT_EXPANDED_PCT)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filterNodeId, setFilterNodeId] = useState<string | null>(null)

  const setExpandedLogPct = useCallback((pct: number) => {
    setExpandedLogPctState(clampExpandedLogPct(pct))
  }, [])

  const expandConsole = useCallback(() => {
    setOpen(true)
    setExpanded(true)
  }, [])

  const minimizeConsole = useCallback(() => {
    setExpanded(false)
  }, [])

  const appendLines = useCallback((next: FlowConsoleLine[]) => {
    if (next.length === 0) return
    setLines((prev) => [...prev, ...next])
  }, [])

  const appendLine = useCallback(
    (message: string, level: FlowConsoleLevel = 'info', nodeId?: string, nodeLabel?: string) => {
      appendLines([
        createFlowConsoleLine(
          message,
          level,
          nodeId ? { id: nodeId, label: nodeLabel ?? nodeId } : undefined,
        ),
      ])
    },
    [appendLines],
  )

  const clearConsole = useCallback(() => {
    setLines([])
  }, [])

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const linesForNode = useCallback(
    (nodeId: string) => lines.filter((line) => line.nodeId === nodeId),
    [lines],
  )

  const value = useMemo<FlowConsoleContextValue>(
    () => ({
      lines,
      open,
      expanded,
      expandedLogPct,
      autoScroll,
      filterNodeId,
      appendLine,
      appendLines,
      clearConsole,
      setOpen,
      setExpanded,
      setExpandedLogPct,
      expandConsole,
      minimizeConsole,
      toggleOpen,
      toggleExpanded,
      setAutoScroll,
      setFilterNodeId,
      linesForNode,
    }),
    [
      lines,
      open,
      expanded,
      expandedLogPct,
      autoScroll,
      filterNodeId,
      appendLine,
      appendLines,
      clearConsole,
      expandConsole,
      minimizeConsole,
      setExpandedLogPct,
      toggleOpen,
      toggleExpanded,
      linesForNode,
    ],
  )

  return <FlowConsoleContext.Provider value={value}>{children}</FlowConsoleContext.Provider>
}
