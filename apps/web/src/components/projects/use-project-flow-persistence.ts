import { useEffect, useRef } from 'react'
import { useUpdateProjectFlowMutation } from '../../hooks/queries/use-projects-query'
import type { ProjectDetail } from './project-sample-data'
import { projectFlowStructureSignature } from './project-flow-utils'

type UseProjectFlowPersistenceOptions = {
  clientId?: string
}

/** Debounced autosave of canvas nodes/edges to the projects API. */
export function useProjectFlowPersistence(
  projectId: string,
  project: ProjectDetail | null,
  options?: UseProjectFlowPersistenceOptions,
) {
  const saveFlow = useUpdateProjectFlowMutation()
  const lastSavedRef = useRef<string | null>(null)
  const lastRevisionRef = useRef<number>(0)
  const saveFlowRef = useRef(saveFlow)
  saveFlowRef.current = saveFlow

  const markRemoteRevision = (remote: ProjectDetail) => {
    lastSavedRef.current = projectFlowStructureSignature(remote)
    lastRevisionRef.current = remote.flowRevision ?? 0
  }

  useEffect(() => {
    if (!project || project.id !== projectId) return

    const signature = projectFlowStructureSignature(project)
    const revision = project.flowRevision ?? 0

    if (lastSavedRef.current === null) {
      lastSavedRef.current = signature
      lastRevisionRef.current = revision
      return
    }

    if (signature === lastSavedRef.current && revision === lastRevisionRef.current) return

    const timer = window.setTimeout(() => {
      saveFlowRef.current.mutate(
        {
          projectId,
          nodes: project.nodes,
          edges: project.edges,
          clientId: options?.clientId,
        },
        {
          onSuccess: (saved) => {
            lastSavedRef.current = projectFlowStructureSignature(saved)
            lastRevisionRef.current = saved.flowRevision ?? revision + 1
          },
        },
      )
    }, 700)

    return () => window.clearTimeout(timer)
  }, [project, projectId, options?.clientId])

  return { markRemoteRevision }
}
