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
import {
  useAgentRuleQuery,
  useDeleteAgentRuleMutation,
  useUpdateAgentRuleMutation,
} from '../../hooks/queries/use-agent-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { AgentRule } from '../../lib/api'
import { MarkdownContent } from '../ui/MarkdownContent'
import { StatusBadge } from '../ui/StatusBadge'
import { RULE_CATEGORY_LABEL, ruleStatusLabel, ruleStatusTone } from './agent-rule-utils'
import { InfoRow } from '../ui/InfoRow'

export function AgentRuleDetailDrawer({
  rule,
  busy,
  onClose,
  onToggle,
  onDeleted,
}: {
  rule: AgentRule | null
  busy: boolean
  onClose: () => void
  onToggle: (id: string, enabled: boolean) => void
  onDeleted?: () => void
}) {
  const accentPalette = useAccentPalette()
  const open = Boolean(rule)
  const detailQuery = useAgentRuleQuery(rule?.id ?? null)
  const deleteMutation = useDeleteAgentRuleMutation()
  const updateMutation = useUpdateAgentRuleMutation()

  const detail = detailQuery.data
  const body = detail?.body ?? rule?.body_preview ?? ''
  const isCustom = rule?.kind === 'custom'

  async function handleDelete() {
    if (!rule) return
    await deleteMutation.mutateAsync(rule.id)
    onDeleted?.()
    onClose()
  }

  return (
    <Drawer.Root open={open} onOpenChange={(d) => !d.open && onClose()} placement="end" size="md">
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content bg="bg.elevated">
            <Drawer.Header borderBottomWidth="1px" borderColor="border.subtle" py={4}>
              <HStack justify="space-between" align="start" w="full">
                <Box minW={0}>
                  <Drawer.Title fontWeight="semibold" lineClamp={1}>
                    {rule?.name}
                  </Drawer.Title>
                  <Text fontSize="sm" color="fg.muted" mt={0.5}>
                    {rule
                      ? `${RULE_CATEGORY_LABEL[rule.category] ?? rule.category} · priority ${rule.priority}`
                      : ''}
                  </Text>
                </Box>
                <IconButton aria-label="Close" size="sm" variant="ghost" onClick={onClose}>
                  <X size={16} />
                </IconButton>
              </HStack>
            </Drawer.Header>

            <Drawer.Body py={4}>
              {rule ? (
                <VStack align="stretch" gap={4}>
                  <HStack gap={2} flexWrap="wrap">
                    <StatusBadge status={ruleStatusTone(rule)} label={ruleStatusLabel(rule)} />
                    <Badge size="sm" variant="subtle" textTransform="none">
                      {rule.kind}
                    </Badge>
                    <Badge size="sm" variant="outline" fontFamily="mono" textTransform="none">
                      {rule.id}
                    </Badge>
                  </HStack>

                  {rule.description ? (
                    <Text fontSize="sm" color="fg.muted">
                      {rule.description}
                    </Text>
                  ) : null}

                  <HStack
                    justify="space-between"
                    p={3}
                    borderWidth="1px"
                    borderColor="border.subtle"
                    borderRadius="var(--radius-card)"
                    bg="bg.panelHover"
                  >
                    <Text fontSize="sm" fontWeight="medium">
                      Enabled for agent runs
                    </Text>
                    <Switch.Root
                      checked={rule.enabled}
                      disabled={busy}
                      colorPalette={accentPalette}
                      onCheckedChange={(e) => onToggle(rule.id, e.checked)}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                    </Switch.Root>
                  </HStack>

                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>
                      Rule content
                    </Text>
                    {detailQuery.isLoading ? (
                      <Text fontSize="sm" color="fg.muted">
                        Loading…
                      </Text>
                    ) : (
                      <Box
                        p={3}
                        borderWidth="1px"
                        borderColor="border.subtle"
                        borderRadius="var(--radius-card)"
                        bg="bg.panel"
                        maxH="320px"
                        overflowY="auto"
                      >
                        <MarkdownContent source={body} />
                      </Box>
                    )}
                  </Box>

                  <Separator borderColor="border.subtle" />

                  <Box>
                    <InfoRow
                      label="Category"
                      value={RULE_CATEGORY_LABEL[rule.category] ?? rule.category}
                    />
                    <InfoRow label="Priority" value={String(rule.priority)} />
                  </Box>

                  {isCustom ? (
                    <Button
                      size="sm"
                      variant="outline"
                      colorPalette="red"
                      borderRadius="var(--radius-input)"
                      loading={deleteMutation.isPending || updateMutation.isPending}
                      onClick={() => void handleDelete()}
                    >
                      <Trash2 size={14} />
                      Delete custom rule
                    </Button>
                  ) : (
                    <Text fontSize="xs" color="fg.muted">
                      Built-in rules cannot be edited. Create a custom rule to add your own
                      policies.
                    </Text>
                  )}
                </VStack>
              ) : null}
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}
