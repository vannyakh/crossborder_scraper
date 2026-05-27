import {
  Badge,
  Box,
  Button,
  Drawer,
  HStack,
  IconButton,
  Portal,
  Separator,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { Trash2, X } from 'lucide-react'
import { StatusBadge } from '../ui/StatusBadge'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { GatewaySkill } from '../../lib/api'
import { SKILL_CATEGORY_LABEL, skillStatusLabel, skillStatusTone } from './skill-utils'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack
      justify="space-between"
      py={2}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      fontSize="sm"
      gap={4}
    >
      <Text color="fg.muted" flexShrink={0}>
        {label}
      </Text>
      <Text fontWeight="medium" fontFamily="mono" fontSize="xs" textAlign="right" lineClamp={2}>
        {value}
      </Text>
    </HStack>
  )
}

export function SkillDetailDrawer({
  skill,
  busy,
  onClose,
  onToggle,
  onUninstall,
}: {
  skill: GatewaySkill | null
  busy: boolean
  onClose: () => void
  onToggle: (id: string, enabled: boolean) => void
  onUninstall: (id: string) => void
}) {
  const accentPalette = useAccentPalette()
  const open = Boolean(skill)

  return (
    <Drawer.Root open={open} onOpenChange={(d) => !d.open && onClose()} placement="end" size="md">
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content bg="bg.elevated">
            <Drawer.Header borderBottomWidth="1px" borderColor="border.subtle" py={4}>
              <HStack justify="space-between" align="start" w="full">
                <HStack align="start" gap={3} minW={0}>
                  <Text fontSize="2xl" aria-hidden>
                    {skill?.emoji}
                  </Text>
                  <Box minW={0}>
                    <Drawer.Title fontWeight="semibold" lineClamp={1}>
                      {skill?.name}
                    </Drawer.Title>
                    <Text fontSize="sm" color="fg.muted" mt={0.5}>
                      {skill
                        ? `${SKILL_CATEGORY_LABEL[skill.category] ?? skill.category} · v${skill.version}`
                        : ''}
                    </Text>
                  </Box>
                </HStack>
                <IconButton
                  aria-label="Close"
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                >
                  <X size={16} />
                </IconButton>
              </HStack>
            </Drawer.Header>

            <Drawer.Body py={4}>
              {skill ? (
                <VStack align="stretch" gap={4}>
                  <HStack gap={2} flexWrap="wrap">
                    <StatusBadge status={skillStatusTone(skill)} label={skillStatusLabel(skill)} />
                    <Badge size="sm" variant="subtle" textTransform="none">
                      {skill.kind}
                    </Badge>
                    {!skill.trusted ? (
                      <Badge size="sm" colorPalette="orange" variant="subtle" textTransform="none">
                        unverified
                      </Badge>
                    ) : null}
                  </HStack>

                  <Text fontSize="sm" color="fg.muted" lineHeight="tall">
                    {skill.description}
                  </Text>

                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>
                      Agent access
                    </Text>
                    <HStack
                      justify="space-between"
                      p={3}
                      borderWidth="1px"
                      borderColor="border.subtle"
                      borderRadius="var(--radius-input)"
                      bg="bg.panelHover"
                    >
                      <Box>
                        <Text fontSize="sm" fontWeight="medium">
                          Enabled for gateway agent
                        </Text>
                        <Text fontSize="xs" color="fg.muted">
                          When on, tools from this skill are available to the agent.
                        </Text>
                      </Box>
                      <Switch.Root
                        checked={skill.enabled}
                        disabled={busy}
                        colorPalette={accentPalette}
                        onCheckedChange={(e) => onToggle(skill.id, !!e.checked)}
                      >
                        <Switch.HiddenInput />
                        <Switch.Control />
                      </Switch.Root>
                    </HStack>
                  </Box>

                  {skill.tools.length > 0 ? (
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>
                        Tools ({skill.tools.length})
                      </Text>
                      <HStack gap={1.5} flexWrap="wrap">
                        {skill.tools.map((tool) => (
                          <Badge
                            key={tool}
                            size="sm"
                            variant="outline"
                            fontFamily="mono"
                            textTransform="none"
                          >
                            {tool}
                          </Badge>
                        ))}
                      </HStack>
                    </Box>
                  ) : null}

                  <Separator borderColor="border.subtle" />

                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={1}>
                      Package info
                    </Text>
                    <InfoRow label="Skill ID" value={skill.id} />
                    {skill.source ? <InfoRow label="Source" value={skill.source} /> : null}
                    {skill.registry_slug ? (
                      <InfoRow label="Registry slug" value={skill.registry_slug} />
                    ) : null}
                    {skill.registry_version ? (
                      <InfoRow label="Registry version" value={skill.registry_version} />
                    ) : null}
                    {skill.installed_at ? (
                      <InfoRow label="Installed" value={skill.installed_at} />
                    ) : null}
                    {skill.path ? <InfoRow label="Path" value={skill.path} /> : null}
                    {skill.homepage ? <InfoRow label="Homepage" value={skill.homepage} /> : null}
                    {skill.registry_url ? (
                      <InfoRow label="Registry" value={skill.registry_url} />
                    ) : null}
                  </Box>
                </VStack>
              ) : null}
            </Drawer.Body>

            {skill?.kind === 'installed' ? (
              <Drawer.Footer borderTopWidth="1px" borderColor="border.subtle" gap={2}>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="red"
                  borderColor="border.subtle"
                  flex={1}
                  disabled={busy}
                  loading={busy}
                  onClick={() => onUninstall(skill.id)}
                >
                  <Trash2 size={14} />
                  Uninstall
                </Button>
              </Drawer.Footer>
            ) : null}
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}
