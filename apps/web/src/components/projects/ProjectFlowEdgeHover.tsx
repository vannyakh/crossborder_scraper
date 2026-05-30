import { Box, HStack, IconButton, Text } from '@chakra-ui/react'
import { EdgeLabelRenderer } from '@xyflow/react'
import { Plus, Trash2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Tooltip } from '@/components/ui/tooltip'
import { useLocale } from '../../hooks/use-locale'
import { edgeHoverAllowsInsert } from './project-flow-connect'
import { useProjectFlowActions } from './project-flow-actions-context'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'

type ProjectFlowEdgeHoverProps = {
  edgeId: string
  path: string
  labelX: number
  labelY: number
  variant: 'main' | 'config'
  source: string
  target: string
}

export function ProjectFlowEdgeHover({
  edgeId,
  path,
  labelX,
  labelY,
  variant,
  source,
  target,
}: ProjectFlowEdgeHoverProps) {
  const { t } = useLocale()
  const { project } = useProjectWorkspace()
  const actions = useProjectFlowActions()
  const [hovered, setHovered] = useState(false)
  const hideTimerRef = useRef<number | undefined>(undefined)

  const showAdd = edgeHoverAllowsInsert(variant, project, source, target)

  const tip = showAdd ? t('projects.flow.edgeAddStep') : t('projects.flow.edgeDelete')

  const show = useCallback(() => {
    if (hideTimerRef.current !== undefined) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = undefined
    }
    setHovered(true)
  }, [])

  const hide = useCallback(() => {
    hideTimerRef.current = window.setTimeout(() => setHovered(false), 120)
  }, [])

  const onAdd = useCallback(() => {
    actions?.openAddBetween(source, target)
  }, [actions, source, target])

  const onRemove = useCallback(() => {
    actions?.removeEdge(edgeId)
  }, [actions, edgeId])

  const hoverClass = [
    'project-flow-edge-hover',
    'nodrag',
    'nopan',
    showAdd ? '' : 'project-flow-edge-hover--delete-only',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        className="project-flow-edge-hit"
        onMouseEnter={show}
        onMouseLeave={hide}
      />
      {hovered ? (
        <EdgeLabelRenderer>
          <Box
            className={hoverClass}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            {showAdd ? <Text className="project-flow-edge-hover__tip">{tip}</Text> : null}
            <HStack className="project-flow-edge-hover__actions" gap={1}>
              {showAdd ? (
                <Tooltip
                  content={t('projects.flow.edgeAddAction')}
                  positioning={{ placement: 'top' }}
                  openDelay={200}
                  showArrow
                >
                  <IconButton
                    className="project-flow-edge-hover__btn"
                    aria-label={t('projects.flow.edgeAddAction')}
                    size="xs"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation()
                      onAdd()
                    }}
                  >
                    <Plus size={14} />
                  </IconButton>
                </Tooltip>
              ) : null}
              <Tooltip
                content={t('projects.flow.edgeDelete')}
                positioning={{ placement: 'top' }}
                openDelay={200}
                showArrow
              >
                <IconButton
                  className="project-flow-edge-hover__btn"
                  aria-label={t('projects.flow.edgeDelete')}
                  size="xs"
                  variant="outline"
                  colorPalette="red"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemove()
                  }}
                >
                  <Trash2 size={14} />
                </IconButton>
              </Tooltip>
            </HStack>
          </Box>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}
