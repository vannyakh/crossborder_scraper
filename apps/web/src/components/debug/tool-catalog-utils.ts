import type { GatewayTool } from '../../lib/api'

export type ToolCategory =
  | 'all'
  | 'scrape'
  | 'export'
  | 'catalog'
  | 'network'
  | 'integrate'
  | 'agent'
  | 'runtime'

export const TOOL_CATEGORY_FILTERS: { id: ToolCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'scrape', label: 'Scrape' },
  { id: 'export', label: 'Export' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'network', label: 'Network' },
  { id: 'integrate', label: 'Integrate' },
  { id: 'agent', label: 'Agent' },
  { id: 'runtime', label: 'Runtime' },
]

export function inferToolCategory(name: string): Exclude<ToolCategory, 'all'> {
  if (name.startsWith('scrape_') || name === 'submit_batch') return 'scrape'
  if (name.startsWith('export_') || name.startsWith('list_marketplace')) return 'export'
  if (name.startsWith('list_product')) return 'catalog'
  if (
    name.includes('firewall') ||
    name.includes('network') ||
    name.startsWith('setup_network') ||
    name.startsWith('apply_panel')
  ) {
    return 'network'
  }
  if (name.includes('integrate')) return 'integrate'
  if (name.includes('agent') || name.includes('rule')) return 'agent'
  if (name.includes('runtime') || name.includes('status')) return 'runtime'
  return 'agent'
}

export function filterToolsByCategory(tools: GatewayTool[], category: ToolCategory): GatewayTool[] {
  if (category === 'all') return tools
  return tools.filter((tool) => inferToolCategory(tool.name) === category)
}

export function searchTools(tools: GatewayTool[], query: string): GatewayTool[] {
  const q = query.trim().toLowerCase()
  if (!q) return tools
  return tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      inferToolCategory(tool.name).includes(q),
  )
}

export type ToolSchemaSummary = {
  required: string[]
  propertyCount: number
}

export function summarizeToolSchema(parameters: Record<string, unknown>): ToolSchemaSummary {
  const props = parameters.properties
  const propertyCount =
    props && typeof props === 'object' ? Object.keys(props as Record<string, unknown>).length : 0
  const required = Array.isArray(parameters.required)
    ? parameters.required.filter((item): item is string => typeof item === 'string')
    : []
  return { required, propertyCount }
}
