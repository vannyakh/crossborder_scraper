import { createContext } from 'react'

import type { FlowConsoleContextValue } from './project-flow-console-context.types'

export const FlowConsoleContext = createContext<FlowConsoleContextValue | null>(null)
