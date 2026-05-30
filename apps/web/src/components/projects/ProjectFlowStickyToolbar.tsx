import { Box, HStack, IconButton, Menu, Portal } from '@chakra-ui/react'
import { Tooltip } from '@/components/ui/tooltip'
import { Copy, CopyPlus, Ellipsis, Palette, PenLine, Trash2 } from 'lucide-react'
import { useLocale } from '../../hooks/use-locale'
import { useProjectFlowActions } from './project-flow-actions-context'
import { STICKY_NOTE_COLOR_ORDER, type StickyNoteColor } from './project-sticky-colors'

type ProjectFlowStickyToolbarProps = {
  nodeId: string
  color: StickyNoteColor
  onColorChange: (color: StickyNoteColor) => void
}

export function ProjectFlowStickyToolbar({
  nodeId,
  color,
  onColorChange,
}: ProjectFlowStickyToolbarProps) {
  const { t } = useLocale()
  const actions = useProjectFlowActions()

  if (!actions) return null

  return (
    <Box className="project-flow-sticky-toolbar nodrag nopan">
      <HStack className="project-flow-sticky-toolbar__inner" gap={0}>
        <Tooltip
          content={t('projects.nodeMenu.remove')}
          positioning={{ placement: 'top' }}
          openDelay={200}
          showArrow
        >
          <IconButton
            className="project-flow-sticky-toolbar__btn"
            aria-label={t('projects.nodeMenu.remove')}
            size="xs"
            variant="ghost"
            colorPalette="red"
            onClick={(event) => {
              event.stopPropagation()
              actions.removeNode(nodeId)
            }}
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </IconButton>
        </Tooltip>

        <Menu.Root positioning={{ placement: 'bottom' }}>
          <Menu.Trigger asChild>
            <IconButton
              className="project-flow-sticky-toolbar__btn"
              aria-label={t('projects.sticky.color')}
              size="xs"
              variant="ghost"
              onClick={(event) => event.stopPropagation()}
            >
              <Palette size={14} strokeWidth={1.75} />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content className="project-flow-sticky-color-menu">
                <HStack gap={2} px={2} py={1.5}>
                  {STICKY_NOTE_COLOR_ORDER.map((preset) => (
                    <Menu.Item
                      key={preset}
                      value={preset}
                      className="project-flow-sticky-color-swatch"
                      data-active={preset === color ? '' : undefined}
                      aria-label={t(`projects.sticky.colors.${preset}`)}
                      onClick={(event) => {
                        event.stopPropagation()
                        onColorChange(preset)
                      }}
                    >
                      <Box className="project-flow-sticky-color-swatch__dot" data-color={preset} />
                    </Menu.Item>
                  ))}
                </HStack>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>

        <Menu.Root positioning={{ placement: 'bottom-end' }}>
          <Menu.Trigger asChild>
            <IconButton
              className="project-flow-sticky-toolbar__btn"
              aria-label={t('projects.sticky.more')}
              size="xs"
              variant="ghost"
              onClick={(event) => event.stopPropagation()}
            >
              <Ellipsis size={14} strokeWidth={1.75} />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content className="project-flow-sticky-more-menu">
                <Menu.Item
                  value="edit"
                  onClick={(event) => {
                    event.stopPropagation()
                    actions.beginStickyEdit(nodeId)
                  }}
                >
                  <PenLine size={14} strokeWidth={1.75} />
                  {t('projects.sticky.edit')}
                </Menu.Item>
                <Menu.Item
                  value="duplicate"
                  onClick={(event) => {
                    event.stopPropagation()
                    actions.duplicateNode(nodeId)
                  }}
                >
                  <CopyPlus size={14} strokeWidth={1.75} />
                  {t('projects.nodeMenu.duplicate')}
                </Menu.Item>
                <Menu.Item
                  value="copy"
                  onClick={(event) => {
                    event.stopPropagation()
                    actions.copyNode(nodeId)
                  }}
                >
                  <Copy size={14} strokeWidth={1.75} />
                  {t('projects.nodeMenu.copy')}
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </HStack>
    </Box>
  )
}
