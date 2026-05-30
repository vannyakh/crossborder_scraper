import { ProjectNodeConfigForm } from './ProjectNodeConfigForm'
import type { NodeConfigSchema, ProjectConfigTabId } from './node-config/registry'
import type { ProjectNode } from './project-sample-data'

export function ProjectNodeConfigBody({
  node,
  tab,
  filter,
  schema,
}: {
  node: ProjectNode
  tab: ProjectConfigTabId
  filter: string
  schema?: NodeConfigSchema
}) {
  return <ProjectNodeConfigForm node={node} tab={tab} filter={filter} schema={schema} />
}
