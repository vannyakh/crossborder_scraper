import { Tooltip } from '@/components/ui/tooltip'
import { ActionBar, HStack, IconButton, Text } from '@chakra-ui/react'
import type { LucideIcon } from 'lucide-react'
import {
    Copy,
    CopyPlus,
    FlaskConical,
    GitBranch,
    LayoutGrid,
    PenLine,
    Pin,
    Play,
    Power,
    RefreshCw,
    Settings2,
    Square,
    Trash2,
} from 'lucide-react'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { useProjectFlowActions } from './project-flow-actions-context'
import type { ProjectNode } from './project-sample-data'

type ProjectFlowCanvasActionBarProps = {
  selectedNode: ProjectNode | null
  running: boolean
  onDismiss: () => void
}

type ActionIconProps = {
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: 'outline' | 'solid' | 'ghost' | 'subtle'
  colorPalette?: string
}

function ActionIcon({
  label,
  icon: Icon,
  onClick,
  variant = 'ghost',
  colorPalette,
}: ActionIconProps) {
  return (
    <Tooltip content={label} positioning={{ placement: 'top' }} openDelay={200} showArrow>
      <IconButton
        className="project-flow-action-bar__btn"
        aria-label={label}
        size="sm"
        variant={variant}
        colorPalette={colorPalette}
        onClick={onClick}
      >
        <Icon size={16} strokeWidth={1.75} />
      </IconButton>
    </Tooltip>
  )
}

export function ProjectFlowCanvasActionBar({
  selectedNode,
  running,
  onDismiss,
}: ProjectFlowCanvasActionBarProps) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const actions = useProjectFlowActions()

  const isNote = selectedNode?.role === 'note'
  const isSubNode = selectedNode?.role === 'config'
  const open = (Boolean(selectedNode) && !isNote && !isSubNode) || running
  if (!actions) return null

  const isTrigger = selectedNode?.role === 'trigger'
  const hasServiceStatus = selectedNode?.status !== undefined
  const powerLabel = hasServiceStatus
    ? selectedNode.status === 'offline'
      ? t('projects.nodeMenu.activate')
      : t('projects.nodeMenu.deactivate')
    : t('projects.nodeMenu.deactivate')

  return (
    <ActionBar.Root
      open={open}
      closeOnInteractOutside={false}
      autoFocus={false}
      onOpenChange={(details) => {
        if (!details.open) onDismiss()
      }}
    >
      <ActionBar.Positioner className="project-flow-action-bar">
        <ActionBar.Content className="project-flow-action-bar__content">
          {selectedNode ? (
            <>
              <ActionBar.SelectionTrigger>
                {t('projects.nodeMenu.title', { name: selectedNode.label })}
              </ActionBar.SelectionTrigger>
              <ActionBar.CloseTrigger />
              <ActionBar.Separator />

              {isNote ? (
                <>
                  <ActionIcon
                    label={t('projects.sticky.edit')}
                    icon={PenLine}
                    onClick={() => actions.beginStickyEdit(selectedNode.id)}
                  />
                  <ActionIcon
                    label={t('projects.nodeMenu.duplicate')}
                    icon={CopyPlus}
                    onClick={() => actions.duplicateNode(selectedNode.id)}
                  />
                  <ActionIcon
                    label={t('projects.nodeMenu.copy')}
                    icon={Copy}
                    onClick={() => actions.copyNode(selectedNode.id)}
                  />
                  <ActionBar.Separator />
                  <ActionIcon
                    label={t('projects.nodeMenu.remove')}
                    icon={Trash2}
                    colorPalette="red"
                    onClick={() => actions.removeNode(selectedNode.id)}
                  />
                </>
              ) : (
                <>
                  <ActionIcon
                    label={t('projects.nodeMenu.open')}
                    icon={Settings2}
                    onClick={() => actions.openNodeConfig(selectedNode.id)}
                  />
                  <ActionIcon
                    label={t('projects.nodeMenu.executeStep')}
                    icon={Play}
                    onClick={() => actions.executeStep(selectedNode.id)}
                  />

                  <ActionBar.Separator />

                  <ActionIcon
                    label={t('projects.nodeMenu.rename')}
                    icon={PenLine}
                    onClick={() => actions.previewNodeAction('rename')}
                  />
                  <ActionIcon
                    label={t('projects.nodeMenu.replace')}
                    icon={RefreshCw}
                    onClick={() => actions.previewNodeAction('replace')}
                  />
                  <ActionIcon
                    label={powerLabel}
                    icon={Power}
                    onClick={() =>
                      hasServiceStatus
                        ? actions.toggleNodeActive(selectedNode.id)
                        : actions.previewNodeAction('deactivate')
                    }
                  />
                  <ActionIcon
                    label={t('projects.nodeMenu.pin')}
                    icon={Pin}
                    onClick={() => actions.previewNodeAction('pin')}
                  />

                  <ActionBar.Separator />

                  <ActionIcon
                    label={t('projects.nodeMenu.duplicate')}
                    icon={CopyPlus}
                    onClick={() => actions.duplicateNode(selectedNode.id)}
                  />
                  <ActionIcon
                    label={t('projects.nodeMenu.copy')}
                    icon={Copy}
                    onClick={() => actions.copyNode(selectedNode.id)}
                  />
                  <ActionIcon
                    label={t('projects.nodeMenu.tidyWorkflow')}
                    icon={LayoutGrid}
                    onClick={() => actions.tidyWorkflow()}
                  />
                  <ActionIcon
                    label={t('projects.nodeMenu.convertSubflow')}
                    icon={GitBranch}
                    onClick={() => actions.previewNodeAction('subflow')}
                  />

                  {isTrigger ? (
                    <>
                      <ActionBar.Separator />
                      <ActionIcon
                        label={running ? t('projects.stopFlow') : t('projects.executeWorkflow')}
                        icon={running ? Square : FlaskConical}
                        variant={running ? 'ghost' : 'solid'}
                        colorPalette={running ? undefined : accentPalette}
                        onClick={() => {
                          if (running) {
                            actions.stopWorkflow()
                          } else {
                            actions.runWorkflow()
                          }
                        }}
                      />
                    </>
                  ) : null}

                  <ActionBar.Separator />

                  <ActionIcon
                    label={t('projects.nodeMenu.remove')}
                    icon={Trash2}
                    colorPalette="red"
                    onClick={() => actions.removeNode(selectedNode.id)}
                  />

                  {running && !isTrigger ? (
                    <ActionIcon
                      label={t('projects.stopFlow')}
                      icon={Square}
                      onClick={() => actions.stopWorkflow()}
                    />
                  ) : null}
                </>
              )}
            </>
          ) : running ? (
            <>
              <HStack gap={2} px={1}>
                <Text fontSize="sm" fontWeight="medium">
                  {t('projects.flowRunning')}
                </Text>
              </HStack>
              <ActionBar.Separator />
              <ActionIcon
                label={t('projects.stopFlow')}
                icon={Square}
                onClick={() => actions.stopWorkflow()}
              />
            </>
          ) : null}
        </ActionBar.Content>
      </ActionBar.Positioner>
    </ActionBar.Root>
  )
}
