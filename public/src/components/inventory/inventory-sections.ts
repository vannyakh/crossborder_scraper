import { FolderOpen, Layers, Package, type LucideIcon } from 'lucide-react'

export type InventorySectionId = 'batches' | 'products' | 'files'

export type InventorySection = {
  id: InventorySectionId
  label: string
  description: string
  icon: LucideIcon
}

export const INVENTORY_SECTIONS: InventorySection[] = [
  {
    id: 'batches',
    label: 'Batches',
    description: 'Submit scrape jobs and track live batch progress',
    icon: Layers,
  },
  {
    id: 'products',
    label: 'Products',
    description: 'Browse scraped catalog and export to marketplaces',
    icon: Package,
  },
  {
    id: 'files',
    label: 'Files',
    description: 'Download JSON exports and generated listing files',
    icon: FolderOpen,
  },
]

export const DEFAULT_INVENTORY_SECTION: InventorySectionId = 'batches'

export const INVENTORY_SECTION_MAP = Object.fromEntries(
  INVENTORY_SECTIONS.map((s) => [s.id, s]),
) as Record<InventorySectionId, InventorySection>

export function isInventorySectionId(value: string | undefined): value is InventorySectionId {
  return value !== undefined && value in INVENTORY_SECTION_MAP
}

export function inventorySectionPath(id: InventorySectionId): string {
  return `/inventory/${id}`
}

export function inventoryProductPath(id: number | string): string {
  return `/inventory/products/${id}`
}

/** Sidebar nav entries */
export const INVENTORY_NAV = INVENTORY_SECTIONS.map((s) => ({
  to: inventorySectionPath(s.id),
  label: s.label,
}))
