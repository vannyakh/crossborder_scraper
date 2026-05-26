import { Archive, FolderOpen, GitBranch, Package, Play } from 'lucide-react'

/** Routes — single source for scrape panel navigation */
export const SCRAPE_ROUTES = {
  workflowBatches: '/workflow/batches',
  artifactProducts: '/artifact/products',
  artifactProduct: (id: number | string) => `/artifact/products/${id}`,
  artifactFiles: '/artifact/files',
  health: '/health',
} as const

export type ScrapeNavBadgeKey = 'running_batches' | 'products' | 'output_files'

/** Sidebar scrape panel (Workflow + Artifacts) */
export const SCRAPE_PANEL_NAV = {
  sectionLabel: 'Scrape panel',
  workflow: {
    id: 'workflow',
    label: 'Workflow',
    description: 'Submit URLs and run batch scrape jobs',
    icon: GitBranch,
    items: [
      {
        to: SCRAPE_ROUTES.workflowBatches,
        label: 'Batch queue',
        description: 'Live jobs, history, cancel runs',
        badgeKey: 'running_batches' as ScrapeNavBadgeKey,
        end: true,
      },
    ],
  },
  artifact: {
    id: 'artifact',
    label: 'Artifacts',
    description: 'Catalog and files produced by scrapes',
    icon: Archive,
    items: [
      {
        to: SCRAPE_ROUTES.artifactProducts,
        label: 'Product catalog',
        description: 'SQLite catalog · export to marketplaces',
        badgeKey: 'products' as ScrapeNavBadgeKey,
      },
      {
        to: SCRAPE_ROUTES.artifactFiles,
        label: 'Export files',
        description: 'JSON/HTML outputs on disk',
        badgeKey: 'output_files' as ScrapeNavBadgeKey,
      },
    ],
  },
} as const

export const SCRAPE_PAGES = {
  workflow: {
    title: 'Batch queue',
    description: 'Submit scrape URLs, watch live progress, and manage batch history',
    icon: Play,
  },
  artifact: {
    title: 'Artifacts',
    description: 'Browse scraped products and download export files from the server',
    icon: Archive,
  },
  artifactSections: {
    products: {
      label: 'Product catalog',
      description: 'Items saved by successful scrape jobs',
    },
    files: {
      label: 'Export files',
      description: 'Files under the server output directory',
    },
  },
} as const

export const SCRAPE_DASHBOARD_TOOLS = [
  {
    id: 'batch-queue',
    icon: Play,
    title: 'Batch queue',
    description: 'Submit URLs, track progress, cancel running jobs.',
    to: SCRAPE_ROUTES.workflowBatches,
    badgeKey: 'running_batches' as ScrapeNavBadgeKey,
    primaryAction: { label: 'New batch', to: SCRAPE_ROUTES.workflowBatches },
  },
  {
    id: 'catalog',
    icon: Package,
    title: 'Product catalog',
    description: 'Browse scraped items and export listings.',
    to: SCRAPE_ROUTES.artifactProducts,
    badgeKey: 'products' as ScrapeNavBadgeKey,
  },
  {
    id: 'exports',
    icon: FolderOpen,
    title: 'Export files',
    description: 'Download JSON exports and generated files.',
    to: SCRAPE_ROUTES.artifactFiles,
    badgeKey: 'output_files' as ScrapeNavBadgeKey,
  },
] as const

export function formatScrapeBadge(key: ScrapeNavBadgeKey, stats: {
  running_batches: number
  products: number
  output_files: number
}): string | undefined {
  switch (key) {
    case 'running_batches':
      return stats.running_batches > 0 ? String(stats.running_batches) : undefined
    case 'products':
      return stats.products > 0 ? String(stats.products) : undefined
    case 'output_files':
      return stats.output_files > 0 ? String(stats.output_files) : undefined
    default:
      return undefined
  }
}
