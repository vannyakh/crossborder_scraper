import { Box } from '@chakra-ui/react'
import { Position } from '@xyflow/react'
import { useLocale } from '../../hooks/use-locale'
import { ProjectFlowMainOutHandle } from './ProjectFlowMainOutHandle'

type ProjectFlowOutRailProps = {
  /** Vertical center of the workflow node body (px from top of node root). */
  anchorTopPx: number
  /** Show “flow entry” hint on trigger roots. */
  showEntryLabel?: boolean
}

/** Main-path output rail: anchor → lead → + port (always visible; drag to connect). */
export function ProjectFlowOutRail({
  anchorTopPx,
  showEntryLabel = false,
}: ProjectFlowOutRailProps) {
  const { t } = useLocale()

  return (
    <Box
      className={['project-flow-out-rail', showEntryLabel ? 'project-flow-out-rail--entry' : '']
        .filter(Boolean)
        .join(' ')}
      style={{ top: `${anchorTopPx}px` }}
    >
      <Box className="project-flow-out-rail__anchor" />
      <Box className="project-flow-out-rail__lead" />
      {showEntryLabel ? (
        <Box className="project-flow-out-rail__entry-label">{t('projects.flow.entryPoint')}</Box>
      ) : null}
      <ProjectFlowMainOutHandle
        showAddStep
        position={Position.Right}
        className="project-flow-handle--rail-end"
      />
    </Box>
  )
}
