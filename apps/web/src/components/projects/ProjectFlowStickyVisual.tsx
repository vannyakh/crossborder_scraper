import { Box } from '@chakra-ui/react'
import { MarkdownContent } from '@/components/ui/MarkdownContent'
import { useLocale } from '../../hooks/use-locale'
import { useUiConfig } from '../../hooks/use-ui-config'
import type { ProjectNode } from './project-sample-data'
import {
  DEFAULT_STICKY_NOTE_COLOR,
  stickyNoteStyleVars,
  type StickyNoteColor,
} from './project-sticky-colors'

type ProjectFlowStickyVisualProps = {
  node: ProjectNode
  width: number
  height: number
}

/** Read-only sticky card — rendered in the portal layer below workflow edges. */
export function ProjectFlowStickyVisual({ node, width, height }: ProjectFlowStickyVisualProps) {
  const { t } = useLocale()
  const { resolved: colorMode } = useUiConfig()
  const color: StickyNoteColor = node.noteColor ?? DEFAULT_STICKY_NOTE_COLOR
  const colorStyle = stickyNoteStyleVars(color, colorMode)
  const hasBody = Boolean(node.noteBody?.trim())

  return (
    <Box
      className="project-flow-sticky-visual"
      data-color={color}
      style={colorStyle}
      w={`${width}px`}
      h={`${height}px`}
    >
      <Box className="project-flow-sticky-node" style={colorStyle}>
        {hasBody ? (
          <Box className="project-flow-sticky-node__body project-flow-sticky-markdown">
            <MarkdownContent source={node.noteBody ?? ''} compact />
          </Box>
        ) : (
          <Box className="project-flow-sticky-node__body project-flow-sticky-node__body--empty">
            {t('projects.sticky.bodyHint')}
          </Box>
        )}
      </Box>
    </Box>
  )
}
