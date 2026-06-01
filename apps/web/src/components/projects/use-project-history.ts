import { useCallback, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { ProjectDetail } from './project-sample-data'

const MAX_HISTORY = 50

/**
 * Manages an undo/redo history stack for the project flow canvas.
 *
 * Usage:
 *   const { pushHistory, undo, redo, canUndo, canRedo } = useProjectHistory(project, setProject)
 *
 * Before any structural mutation call `pushHistory(project)` to snapshot the
 * current state, then proceed with `setProject(...)` as normal.
 * `undo()` and `redo()` restore snapshots without re-snapshotting.
 */
export function useProjectHistory(
  project: ProjectDetail,
  setProject: Dispatch<SetStateAction<ProjectDetail>>,
) {
  const pastRef = useRef<ProjectDetail[]>([])
  const futureRef = useRef<ProjectDetail[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const syncFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0)
    setCanRedo(futureRef.current.length > 0)
  }, [])

  /**
   * Snapshot the state BEFORE applying a mutation.
   * Pass the current `project` value from the component closure.
   * This also clears the redo stack because a new branch starts.
   */
  const pushHistory = useCallback(
    (snapshot: ProjectDetail) => {
      pastRef.current = [...pastRef.current, snapshot].slice(-MAX_HISTORY)
      futureRef.current = []
      syncFlags()
    },
    [syncFlags],
  )

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return
    const past = pastRef.current
    const prev = past[past.length - 1]
    pastRef.current = past.slice(0, -1)
    futureRef.current = [project, ...futureRef.current].slice(0, MAX_HISTORY)
    setProject(prev)
    syncFlags()
  }, [project, setProject, syncFlags])

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    const [next, ...rest] = futureRef.current
    futureRef.current = rest
    pastRef.current = [...pastRef.current, project].slice(-MAX_HISTORY)
    setProject(next)
    syncFlags()
  }, [project, setProject, syncFlags])

  return { pushHistory, undo, redo, canUndo, canRedo }
}
