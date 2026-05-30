import type { FlowConsoleLine, FlowConsoleLevel } from './project-flow-console'

export type FlowConsoleState = {
  lines: FlowConsoleLine[]
  open: boolean
  expanded: boolean
  /** Last expanded splitter height (% of workspace). */
  expandedLogPct: number
  autoScroll: boolean
  filterNodeId: string | null
}

export type FlowConsoleActions = {
  appendLine: (
    message: string,
    level?: FlowConsoleLevel,
    nodeId?: string,
    nodeLabel?: string,
  ) => void
  appendLines: (lines: FlowConsoleLine[]) => void
  clearConsole: () => void
  setOpen: (open: boolean) => void
  setExpanded: (expanded: boolean) => void
  setExpandedLogPct: (pct: number) => void
  expandConsole: () => void
  minimizeConsole: () => void
  toggleOpen: () => void
  toggleExpanded: () => void
  setAutoScroll: (value: boolean) => void
  setFilterNodeId: (nodeId: string | null) => void
  linesForNode: (nodeId: string) => FlowConsoleLine[]
}

export type FlowConsoleContextValue = FlowConsoleState & FlowConsoleActions
