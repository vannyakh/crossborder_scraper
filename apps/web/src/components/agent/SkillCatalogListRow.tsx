import { Badge, Box, HStack, Text } from '@chakra-ui/react'
import { StatusBadge } from '../ui/StatusBadge'
import type { GatewaySkill } from '../../lib/api'
import { SkillCatalogActions } from './SkillCatalogActions'
import { SKILL_CATEGORY_LABEL, skillStatusLabel, skillStatusTone } from './skill-utils'

export function SkillCatalogListRow({
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
  return (
    <Box
      display="flex"
      flexDirection={{ base: 'column', lg: 'row' }}
      alignItems={{ base: 'stretch', lg: 'center' }}
      gap={{ base: 3, lg: 4 }}
      p={4}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      _last={{ borderBottomWidth: 0 }}
      _hover={{ bg: 'bg.panelHover' }}
    >
      <HStack flex={1} minW={0} align="start" gap={3}>
        <Box
          p={2}
          borderRadius="var(--radius-card)"
          bg="bg.panelHover"
          fontSize="lg"
          lineHeight={1}
          flexShrink={0}
          aria-hidden
        >
          {skill.emoji}
        </Box>
        <Box minW={0} flex={1}>
          <HStack justify="space-between" gap={2} flexWrap="wrap">
            <Box minW={0}>
              <Text fontWeight="semibold" lineClamp={1}>
                {skill.name}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {SKILL_CATEGORY_LABEL[skill.category] ?? skill.category} · v{skill.version} ·{' '}
                {skill.kind}
              </Text>
            </Box>
            <StatusBadge status={skillStatusTone(skill)} label={skillStatusLabel(skill)} />
          </HStack>
          <Text mt={1} fontSize="sm" color="fg.muted" lineClamp={1} title={skill.description}>
            {skill.description}
          </Text>
          {skill.tools.length > 0 ? (
            <HStack mt={1.5} gap={1} flexWrap="wrap">
              {skill.tools.map((tool) => (
                <Badge key={tool} size="sm" variant="subtle" fontFamily="mono" textTransform="none">
                  {tool}
                </Badge>
              ))}
            </HStack>
          ) : null}
        </Box>
      </HStack>

      <Box w={{ base: 'full', lg: '280px' }} flexShrink={0}>
        <SkillCatalogActions skill={skill} busy={busy} onToggle={onToggle} onDetails={onDetails} />
      </Box>
    </Box>
  )
}
