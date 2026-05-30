import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'
import { getAgentSlotSources } from './project-flow-layout'
import { useProjectFlowActions } from './project-flow-actions-context'
import { NODE_VISUAL } from './project-node-meta'
import type { AgentSlotIndex, ProjectNode } from './project-sample-data'

type ProjectAgentSlotChipsProps = {
  agent: ProjectNode
}

export function ProjectAgentSlotChips({ agent }: ProjectAgentSlotChipsProps) {
  const { t } = useLocale()
  const { project } = useProjectWorkspace()
  const actions = useProjectFlowActions()

  const slots = useMemo(() => getAgentSlotSources(project, agent.id), [project, agent.id])

  if (!actions || slots.length === 0) return null

  const onSlotClick = (slotIndex: AgentSlotIndex, occupied: boolean, sourceId: string | null) => {
    if (occupied && sourceId) {
      actions.focusCanvasNode(sourceId, { openConfig: true })
      return
    }
    actions.openSlotAdd(agent.id, slotIndex)
  }

  return (
    <Box className="project-agent-slot-chips" borderTopWidth="1px" borderColor="border.subtle">
      <Text
        className="project-agent-slot-chips__title"
        px={4}
        pt={3}
        pb={2}
        fontSize="xs"
        fontWeight="semibold"
        color="fg.muted"
      >
        {t('projects.config.agentSlots')}
      </Text>
      <HStack className="project-agent-slot-chips__row" px={3} pb={3} gap={2} flexWrap="wrap">
        {slots.map((slot) => {
          const slotLabel = slot.labelKey ? t(slot.labelKey) : ''
          const meta = slot.sourceNode ? NODE_VISUAL[slot.sourceNode.kind] : null
          const Icon = meta?.icon
          const valueLabel = slot.sourceNode?.label ?? t('projects.config.agentSlotEmpty')

          return (
            <Button
              key={slot.slotIndex}
              className={[
                'project-agent-slot-chip',
                slot.occupied
                  ? 'project-agent-slot-chip--occupied'
                  : 'project-agent-slot-chip--empty',
                slot.required && !slot.occupied ? 'project-agent-slot-chip--required' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              size="xs"
              variant="outline"
              onClick={() =>
                onSlotClick(slot.slotIndex, slot.occupied, slot.sourceNode?.id ?? null)
              }
            >
              {slot.occupied && Icon ? (
                <Box
                  className="project-agent-slot-chip__icon"
                  style={{ background: meta?.iconBg, color: meta?.iconColor }}
                  aria-hidden
                >
                  <Icon size={12} strokeWidth={1.75} />
                </Box>
              ) : (
                <Box
                  className="project-agent-slot-chip__icon project-agent-slot-chip__icon--add"
                  aria-hidden
                >
                  <Plus size={12} strokeWidth={2} />
                </Box>
              )}
              <Box className="project-agent-slot-chip__copy" minW={0}>
                <Text className="project-agent-slot-chip__slot" lineClamp={1}>
                  {slotLabel}
                  {slot.required ? (
                    <Text as="span" className="project-agent-slot-chip__required">
                      {' *'}
                    </Text>
                  ) : null}
                </Text>
                <Text className="project-agent-slot-chip__value" lineClamp={1} title={valueLabel}>
                  {valueLabel}
                </Text>
              </Box>
            </Button>
          )
        })}
      </HStack>
    </Box>
  )
}
