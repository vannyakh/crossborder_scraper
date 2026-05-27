import { Badge, Box, HStack, Text } from '@chakra-ui/react'
import { StatusBadge } from '../ui/StatusBadge'
import type { GatewaySkill } from '../../lib/api'
import { SkillCatalogActions } from './SkillCatalogActions'
import { SKILL_CATEGORY_LABEL, skillStatusLabel, skillStatusTone } from './skill-utils'

export function SkillCatalogCard({
  skill,
  busy,
  onToggle,
  onDetails,
}: {
  skill: GatewaySkill
  busy: boolean
  onToggle: (id: string, enabled: boolean) => void
  onDetails: (id: string) => void
}) {
  const visibleTools = skill.tools.slice(0, 4)
  const extraTools = skill.tools.length - visibleTools.length

  return (
    <Box
      display="flex"
      flexDirection="column"
      h="full"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-panel)"
      bg="bg.elevated"
      overflow="hidden"
      transition="border-color var(--motion-duration)"
      _hover={{ borderColor: 'border.default' }}
    >
      <Box p={4} flex={1}>
        <HStack justify="space-between" align="start" gap={3} mb={3}>
          <HStack align="start" gap={3} minW={0}>
            <Box
              p={2}
              borderRadius="var(--radius-card)"
              bg="bg.panelHover"
              fontSize="xl"
              lineHeight={1}
              flexShrink={0}
              aria-hidden
            >
              {skill.emoji}
            </Box>
            <Box minW={0}>
              <Text fontWeight="semibold" lineClamp={1}>
                {skill.name}
              </Text>
              <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                {SKILL_CATEGORY_LABEL[skill.category] ?? skill.category} · v{skill.version}
              </Text>
            </Box>
          </HStack>
          <StatusBadge status={skillStatusTone(skill)} label={skillStatusLabel(skill)} />
        </HStack>

        <Text fontSize="sm" color="fg.muted" lineClamp={2} minH="2.75em" title={skill.description}>
          {skill.description}
        </Text>

        <HStack mt={2} gap={1} flexWrap="wrap">
          <Badge size="sm" variant="subtle" textTransform="none">
            {skill.kind}
          </Badge>
          {!skill.trusted ? (
            <Badge size="sm" colorPalette="orange" variant="subtle" textTransform="none">
              unverified
            </Badge>
          ) : null}
        </HStack>

        {visibleTools.length > 0 ? (
          <HStack mt={2} gap={1} flexWrap="wrap">
            {visibleTools.map((tool) => (
              <Badge key={tool} size="sm" variant="outline" fontFamily="mono" textTransform="none">
                {tool}
              </Badge>
            ))}
            {extraTools > 0 ? (
              <Text fontSize="xs" color="fg.subtle">
                +{extraTools} more
              </Text>
            ) : null}
          </HStack>
        ) : null}
      </Box>

      <Box px={4} py={3} borderTopWidth="1px" borderColor="border.subtle" bg="bg.panelHover">
        <SkillCatalogActions skill={skill} busy={busy} onToggle={onToggle} onDetails={onDetails} />
      </Box>
    </Box>
  )
}
