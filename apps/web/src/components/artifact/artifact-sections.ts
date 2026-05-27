import { FolderOpen, Package, type LucideIcon } from 'lucide-react'
import { SCRAPE_PAGES, SCRAPE_ROUTES } from '../../config/scrape-panel'

export type ArtifactSectionId = 'products' | 'files'

export type ArtifactSection = {
  id: ArtifactSectionId
  label: string
  description: string
  icon: LucideIcon
}

export const ARTIFACT_SECTIONS: ArtifactSection[] = [
  {
    id: 'products',
    label: SCRAPE_PAGES.artifactSections.products.label,
    description: SCRAPE_PAGES.artifactSections.products.description,
    icon: Package,
  },
  {
    id: 'files',
    label: SCRAPE_PAGES.artifactSections.files.label,
    description: SCRAPE_PAGES.artifactSections.files.description,
    icon: FolderOpen,
  },
]

export const DEFAULT_ARTIFACT_SECTION: ArtifactSectionId = 'products'

export const ARTIFACT_SECTION_MAP = Object.fromEntries(
  ARTIFACT_SECTIONS.map((s) => [s.id, s]),
) as Record<ArtifactSectionId, ArtifactSection>

export function isArtifactSectionId(value: string | undefined): value is ArtifactSectionId {
  return value !== undefined && value in ARTIFACT_SECTION_MAP
}

export function artifactSectionPath(id: ArtifactSectionId): string {
  return id === 'products' ? SCRAPE_ROUTES.artifactProducts : SCRAPE_ROUTES.artifactFiles
}

export function artifactProductPath(id: number | string): string {
  return SCRAPE_ROUTES.artifactProduct(id)
}
