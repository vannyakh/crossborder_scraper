import type { ProjectDetail } from '../../components/projects/project-sample-data'

/** Service labels for logs and runtime charts derived from flow nodes. */
export function projectServiceNames(project: ProjectDetail): string[] {
  return project.nodes
    .filter((n) => n.role !== 'config')
    .map((n) => n.subtitle?.split(':').pop()?.trim() || n.label)
    .slice(0, 5)
}
