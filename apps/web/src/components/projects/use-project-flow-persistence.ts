import { useEffect, useRef } from 'react'
import { useUpdateProjectFlowMutation } from '../../hooks/queries/use-projects-query'
import type { ProjectDetail } from './project-sample-data'
import { projectFlowPersistSignature } from './project-flow-utils'

type UseProjectFlowPersistenceOptions = {
  clientId?: string
  onSaved?: (saved: ProjectDetail) => void
}

/** Debounced autosave of canvas nodes/edges (including positions) to the projects API. */
export function useProjectFlowPersistence(
  projectId: string,
  project: ProjectDetail | null,
  options?: UseProjectFlowPersistenceOptions,
) {
  const saveFlow = useUpdateProjectFlowMutation()
  const lastSavedRef = useRef<string | null>(null)
  const lastRevisionRef = useRef<number>(0)
  const saveFlowRef = useRef(saveFlow)
  const onSavedRef = useRef(options?.onSaved)
  saveFlowRef.current = saveFlow
  onSavedRef.current = options?.onSaved

  const markRemoteRevision = (remote: ProjectDetail) => {
    lastSavedRef.current = projectFlowPersistSignature(remote)
    lastRevisionRef.current = remote.flowRevision ?? 0
  }

  useEffect(() => {
    if (!project || project.id !== projectId) return

    const signature = projectFlowPersistSignature(project)
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
            lastSavedRef.current = projectFlowPersistSignature(saved)
            lastRevisionRef.current = saved.flowRevision ?? revision + 1
            onSavedRef.current?.(saved)
          },
        },
      )
    }, 700)

    return () => window.clearTimeout(timer)
  }, [project, projectId, options?.clientId])

  return { markRemoteRevision }
}
