import type { GatewaySkill } from '../../lib/api'

export const SKILL_CATEGORY_LABEL: Record<string, string> = {
  scrape: 'Scrape',
  catalog: 'Catalog',
  export: 'Export',
}

export const SKILL_CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'scrape', label: 'Scrape' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'export', label: 'Export' },
] as const

export type SkillCategoryFilter = (typeof SKILL_CATEGORY_FILTERS)[number]['id']
export type SkillTab = 'catalog' | 'enabled' | 'custom'

export function filterSkillsByCategory(items: GatewaySkill[], category: SkillCategoryFilter) {
  if (category === 'all') return items
  return items.filter((item) => item.category === category)
}

export function filterSkillsByTab(items: GatewaySkill[], tab: SkillTab) {
  if (tab === 'enabled') return items.filter((item) => item.enabled)
  if (tab === 'custom') return items.filter((item) => item.kind === 'installed')
  return items
}

export function searchSkills(items: GatewaySkill[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => {
    const haystack = [
      item.name,
      item.id,
      item.description,
      item.category,
      item.kind,
      item.version,
      ...item.tools,
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function skillStatusTone(skill: GatewaySkill): 'success' | 'neutral' | 'warning' {
  if (skill.enabled) return 'success'
  if (skill.kind === 'installed' && !skill.trusted) return 'warning'
  return 'neutral'
}

export function skillStatusLabel(skill: GatewaySkill): string {
  if (skill.enabled) return 'enabled'
  return skill.kind === 'installed' ? 'installed' : 'available'
}
