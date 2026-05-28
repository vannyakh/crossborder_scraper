import { useMemo } from 'react'
import { usePanelGuidesQuery } from './queries/use-panel-guides-query'

/** Map dashboard software-tool card id → panel guide id (from GET /guides). */
export function useToolGuideMap() {
  const { data } = usePanelGuidesQuery()

  return useMemo(() => {
    const map: Record<string, string> = {}
    for (const guide of data?.items ?? []) {
      for (const toolId of guide.tool_ids) {
        map[toolId] = guide.id
      }
    }
    return map
  }, [data?.items])
}
