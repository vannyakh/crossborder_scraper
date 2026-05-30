import { Box, Splitter } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { ProjectFlowConsole } from './ProjectFlowConsole'
import {
  clampExpandedLogPct,
  expandedCanvasSplit,
  FLOW_CONSOLE_EXPANDED_MAX_PCT,
  FLOW_CONSOLE_EXPANDED_MIN_PCT,
  FLOW_CONSOLE_EXPANDED_THRESHOLD_PCT,
  FLOW_CONSOLE_MINIMIZED_PCT,
  FLOW_CONSOLE_MINIMIZED_THRESHOLD_PCT,
  hiddenCanvasSplit,
  minimizedCanvasSplit,
} from './project-flow-console-layout'
import { useFlowConsole } from './use-flow-console'

const PANEL_CANVAS = 'canvas'
const PANEL_LOGS = 'logs'

type ProjectFlowCanvasSplitterProps = {
  canvas: ReactNode
}

export function ProjectFlowCanvasSplitter({ canvas }: ProjectFlowCanvasSplitterProps) {
  const flowConsole = useFlowConsole()
  const flowConsoleRef = useRef(flowConsole)
  useEffect(() => {
    flowConsoleRef.current = flowConsole
  })

  const [size, setSize] = useState<number[]>(hiddenCanvasSplit())
  const skipSyncRef = useRef(false)

  const logPanels = useMemo(
    () => [
      { id: PANEL_CANVAS, minSize: 100 - FLOW_CONSOLE_EXPANDED_MAX_PCT },
      {
        id: PANEL_LOGS,
        minSize: flowConsole.expanded ? FLOW_CONSOLE_EXPANDED_MIN_PCT : FLOW_CONSOLE_MINIMIZED_PCT,
        maxSize: flowConsole.expanded ? FLOW_CONSOLE_EXPANDED_MAX_PCT : FLOW_CONSOLE_MINIMIZED_PCT,
      },
    ],
    [flowConsole.expanded],
  )

  const applyPanelSize = useCallback((open: boolean, expanded: boolean, expandedLogPct: number) => {
    skipSyncRef.current = true
    if (!open) {
      setSize(hiddenCanvasSplit())
      return
    }
    if (!expanded) {
      setSize(minimizedCanvasSplit())
      return
    }
    setSize(expandedCanvasSplit(expandedLogPct))
  }, [])

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false
      return
    }
    applyPanelSize(flowConsole.open, flowConsole.expanded, flowConsole.expandedLogPct)
  }, [applyPanelSize, flowConsole.expanded, flowConsole.expandedLogPct, flowConsole.open])

  const handleResize = useCallback((next: number[]) => {
    setSize(next)
    const logPct = next[1] ?? 0
    const consoleApi = flowConsoleRef.current

    if (logPct <= FLOW_CONSOLE_MINIMIZED_THRESHOLD_PCT) {
      if (consoleApi.open && consoleApi.expanded) {
        consoleApi.minimizeConsole()
      }
      return
    }

    if (!consoleApi.open) consoleApi.setOpen(true)

    if (logPct >= FLOW_CONSOLE_EXPANDED_THRESHOLD_PCT) {
      const clamped = clampExpandedLogPct(logPct)
      consoleApi.setExpandedLogPct(clamped)
      if (!consoleApi.expanded) consoleApi.expandConsole()
      return
    }

    if (consoleApi.expanded) consoleApi.minimizeConsole()
  }, [])

  const logsVisible = flowConsole.open && (size[1] ?? 0) > 0.5

  return (
    <Splitter.Root
      className="project-flow-splitter"
      orientation="vertical"
      flex={1}
      minH={0}
      h="100%"
      w="100%"
      panels={logPanels}
      size={size}
      onResize={(details) => handleResize(details.size)}
    >
      <Splitter.Panel id={PANEL_CANVAS} className="project-flow-splitter__canvas">
        <Box className="project-flow-canvas-stage" position="relative" h="100%" minH={0}>
          {canvas}
        </Box>
      </Splitter.Panel>

      <Splitter.ResizeTrigger
        id={`${PANEL_CANVAS}:${PANEL_LOGS}`}
        className="project-flow-splitter__handle"
        disabled={!flowConsole.expanded || !logsVisible}
        data-hidden={flowConsole.expanded && logsVisible ? undefined : ''}
      />

      <Splitter.Panel
        id={PANEL_LOGS}
        className="project-flow-splitter__logs"
        data-minimized={flowConsole.open && !flowConsole.expanded ? '' : undefined}
        data-expanded={flowConsole.open && flowConsole.expanded ? '' : undefined}
        data-hidden={logsVisible ? undefined : ''}
      >
        {logsVisible ? <ProjectFlowConsole /> : null}
      </Splitter.Panel>
    </Splitter.Root>
  )
}
