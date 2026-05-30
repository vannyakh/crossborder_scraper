import { formatModelRef } from '../../config/llm-providers'
import type { ProjectNode } from '../../components/projects/project-sample-data'

/** Sync node subtitle from LLM provider/model option keys after config edits. */
export function syncModelSubtitle(node: ProjectNode): ProjectNode {
  const provider = String(node.options?.llm_provider ?? 'openai')
  const model = String(node.options?.llm_model ?? '')
  if (!model) return node
  const ref = formatModelRef(provider, model)
  return {
    ...node,
    subtitle: ref.replace('/', ': '),
    options: {
      ...node.options,
      model_ref: ref,
    },
  }
}

export function syncScraperSubtitle(node: ProjectNode): ProjectNode {
  const pluginId = String(node.options?.plugin_id ?? node.pluginId ?? '')
  if (!pluginId) return node
  return {
    ...node,
    pluginId,
    subtitle: pluginId,
  }
}

export function syncNodeFromPluginOptions(node: ProjectNode): ProjectNode {
  if (node.pluginProfile === 'llm-model' || node.options?.llm_model) {
    return syncModelSubtitle(node)
  }
  if (node.kind === 'scrape' || node.pluginProfile?.startsWith('scraper-')) {
    return syncScraperSubtitle(node)
  }
  return node
}
