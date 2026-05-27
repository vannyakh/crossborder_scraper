import type { AgentRule } from '../../lib/api'

export const RULE_CATEGORY_LABEL: Record<string, string> = {
  safety: 'Safety',
  behavior: 'Behavior',
  tools: 'Tools',
  output: 'Output',
  general: 'General',
}

export const RULE_CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'safety', label: 'Safety' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'tools', label: 'Tools' },
  { id: 'output', label: 'Output' },
  { id: 'general', label: 'General' },
] as const

export type RuleCategoryFilter = (typeof RULE_CATEGORY_FILTERS)[number]['id']

export function filterRulesByCategory(items: AgentRule[], category: RuleCategoryFilter): AgentRule[] {
  if (category === 'all') return items
  return items.filter((r) => r.category === category)
}

export function searchRules(items: AgentRule[], query: string): AgentRule[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (r) =>
      r.id.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q),
  )
}

export function ruleStatusLabel(rule: AgentRule): string {
  return rule.enabled ? 'enabled' : 'disabled'
}

export function ruleStatusTone(rule: AgentRule): 'success' | 'neutral' {
  return rule.enabled ? 'success' : 'neutral'
}
