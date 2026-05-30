import { useContext } from 'react'

import { FlowConsoleContext } from './project-flow-console-context-value'
import type { FlowConsoleContextValue } from './project-flow-console-context.types'

export function useFlowConsole(): FlowConsoleContextValue {
  const ctx = useContext(FlowConsoleContext)
  if (!ctx) {
    throw new Error('useFlowConsole must be used within ProjectFlowConsoleProvider')
  }
  return ctx
}

export function useFlowConsoleOptional(): FlowConsoleContextValue | null {
  return useContext(FlowConsoleContext)
}
