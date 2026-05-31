import type { ProjectDetail } from '../../components/projects/project-sample-data'

export type ApiProjectSummary = {
  id: string
  name: string
  environment: ProjectDetail['environment']
  services_online: number
  services_total: number
  updated_at: string
  description?: string | null
  preview_nodes: ProjectDetail['previewNodes']
  preview_edges: ProjectDetail['previewEdges']
}

export type ApiProjectDetail = ApiProjectSummary & {
  nodes: ProjectDetail['nodes']
  edges: ProjectDetail['edges']
  flow_revision: number
}

export type ApiProjectList = {
  items: ApiProjectSummary[]
  total: number
}

export type ApiProjectTemplateSummary = {
  id: string
  name: string
  summary: string
  category: string
  category_label: string
  tags: string[]
  author: string
  featured: boolean
  node_count: number
  preview_nodes: ProjectDetail['previewNodes']
  preview_edges: ProjectDetail['previewEdges']
  source_path: string
}

export type ApiProjectTemplateDetail = ApiProjectTemplateSummary & {
  description: string
  nodes: ProjectDetail['nodes']
  edges: ProjectDetail['edges']
}

export type ApiProjectTemplateList = {
  items: ApiProjectTemplateSummary[]
  categories: Array<{ id: string; label: string; count: number }>
  total: number
}

export type ApiProjectTemplateUseResponse = {
  template_id: string
  template_name: string
  project: ApiProjectDetail
}

export function mapProjectDetail(raw: ApiProjectDetail): ProjectDetail {
  return {
    id: raw.id,
    name: raw.name,
    environment: raw.environment,
    servicesOnline: raw.services_online,
    servicesTotal: raw.services_total,
    updatedAt: raw.updated_at,
    flowRevision: raw.flow_revision ?? 0,
    description: raw.description ?? undefined,
    previewNodes: raw.preview_nodes ?? [],
    previewEdges: raw.preview_edges ?? [],
    nodes: raw.nodes ?? [],
    edges: raw.edges ?? [],
  }
}

export function mapProjectSummary(raw: ApiProjectSummary): ProjectDetail {
  return mapProjectDetail({
    ...raw,
    nodes: [],
    edges: [],
    flow_revision: 0,
  })
}
