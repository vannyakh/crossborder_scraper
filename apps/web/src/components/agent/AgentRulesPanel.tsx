import {
  Badge,
  Box,
  Button,
  Dialog,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Portal,
  Separator,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { Plus, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  useCreateAgentRuleMutation,
  useGatewayRulesQuery,
  useSetEnabledRulesMutation,
} from '../../hooks/queries/use-agent-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { AgentRule, AgentRuleCreate } from '../../lib/api'
import { Toolbar } from '../layout/Toolbar'
import { StoreFilterBar } from '../store/StoreFilterBar'
import { StorePagination } from '../store/StorePagination'
import { useStoreListState, useStorePagedList } from '../store/store-utils'
import { DataListEmpty } from '../ui/DataList'
import { CardGridSkeleton } from '../ui/PanelSkeleton'
import { SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import { AgentRuleDetailDrawer } from './AgentRuleDetailDrawer'
import {
  RULE_CATEGORY_FILTERS,
  RULE_CATEGORY_LABEL,
  filterRulesByCategory,
  ruleStatusLabel,
  ruleStatusTone,
  searchRules,
  type RuleCategoryFilter,
} from './agent-rule-utils'

function RuleCard({
  rule,
  busy,
  onToggle,
  onDetails,
}: {
  rule: AgentRule
  busy: boolean
  onToggle: (id: string, enabled: boolean) => void
  onDetails: (id: string) => void
}) {
  const accentPalette = useAccentPalette()

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
          <Box minW={0}>
            <Text fontWeight="semibold" lineClamp={1}>
              {rule.name}
            </Text>
            <Text fontSize="xs" color="fg.muted" lineClamp={1}>
              {RULE_CATEGORY_LABEL[rule.category] ?? rule.category} · priority {rule.priority}
            </Text>
          </Box>
          <StatusBadge status={ruleStatusTone(rule)} label={ruleStatusLabel(rule)} />
        </HStack>

        <Text fontSize="sm" color="fg.muted" lineClamp={3} minH="3.75em" title={rule.description}>
          {rule.description || rule.body_preview}
        </Text>

        <HStack mt={2} gap={1} flexWrap="wrap">
          <Badge size="sm" variant="subtle" textTransform="none">
            {rule.kind}
          </Badge>
          <Badge size="sm" variant="outline" fontFamily="mono" textTransform="none">
            {rule.id}
          </Badge>
        </HStack>
      </Box>

      <Box px={4} py={3} borderTopWidth="1px" borderColor="border.subtle" bg="bg.panelHover">
        <HStack gap={2} w="full">
          <Button
            size="sm"
            flex={1}
            colorPalette={accentPalette}
            borderRadius="var(--radius-input)"
            disabled={busy}
            onClick={() => onToggle(rule.id, !rule.enabled)}
          >
            {rule.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            size="sm"
            flex={1}
            variant="outline"
            borderColor="border.subtle"
            borderRadius="var(--radius-input)"
            onClick={() => onDetails(rule.id)}
          >
            View
          </Button>
        </HStack>
      </Box>
    </Box>
  )
}

function AgentRuleCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (ruleId: string) => void
}) {
  const accentPalette = useAccentPalette()
  const createMutation = useCreateAgentRuleMutation()
  const [form, setForm] = useState<AgentRuleCreate>({
    id: '',
    name: '',
    description: '',
    category: 'general',
    body: '',
    priority: 50,
  })

  function resetForm() {
    setForm({
      id: '',
      name: '',
      description: '',
      category: 'general',
      body: '',
      priority: 50,
    })
  }

  async function handleSubmit() {
    const payload: AgentRuleCreate = {
      ...form,
      id: form.id.trim().toLowerCase(),
      name: form.name.trim(),
      description: form.description?.trim() || '',
    }
    const created = await createMutation.mutateAsync(payload)
    resetForm()
    onCreated(created.id)
    onClose()
  }

  const canSubmit =
    form.id.trim().length > 0 &&
    form.name.trim().length > 0 &&
    form.body.trim().length > 0 &&
    !createMutation.isPending

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) {
          resetForm()
          onClose()
        }
      }}
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner display="flex" alignItems="center" justifyContent="center" p={4}>
          <Dialog.Content maxW="560px" w="full" bg="bg.elevated">
            <Dialog.Header borderBottomWidth="1px" borderColor="border.subtle">
              <Dialog.Title fontWeight="semibold">Create custom rule</Dialog.Title>
              <Dialog.Description fontSize="sm" color="fg.muted" mt={1}>
                Custom rules are saved under data/agent_rules and injected into the agent system
                prompt when enabled.
              </Dialog.Description>
            </Dialog.Header>

            <Dialog.Body py={4}>
              <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3}>
                <Field.Root required>
                  <Field.Label>Rule id</Field.Label>
                  <Input
                    value={form.id}
                    placeholder="my-export-policy"
                    fontFamily="mono"
                    onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                  />
                  <Field.HelperText>
                    Lowercase letters, numbers, hyphens, underscores.
                  </Field.HelperText>
                </Field.Root>

                <Field.Root required>
                  <Field.Label>Name</Field.Label>
                  <Input
                    value={form.name}
                    placeholder="My export policy"
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </Field.Root>

                <Field.Root gridColumn={{ sm: '1 / -1' }}>
                  <Field.Label>Description</Field.Label>
                  <Input
                    value={form.description}
                    placeholder="Short summary for the rules list"
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Category</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          category: e.target.value as AgentRuleCreate['category'],
                        }))
                      }
                    >
                      {RULE_CATEGORY_FILTERS.filter((c) => c.id !== 'all').map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label>Priority</Field.Label>
                  <Input
                    type="number"
                    min={0}
                    max={999}
                    value={form.priority ?? 50}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priority: Number(e.target.value) || 50 }))
                    }
                  />
                  <Field.HelperText>Lower runs earlier in the prompt.</Field.HelperText>
                </Field.Root>

                <Field.Root required gridColumn={{ sm: '1 / -1' }}>
                  <Field.Label>Rule body (markdown)</Field.Label>
                  <Textarea
                    rows={8}
                    value={form.body}
                    placeholder="Write instructions the agent must follow…"
                    fontFamily="mono"
                    fontSize="sm"
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  />
                </Field.Root>
              </Grid>

              {createMutation.error ? (
                <Text mt={3} fontSize="sm" color="red.500">
                  {String((createMutation.error as Error).message || createMutation.error)}
                </Text>
              ) : null}
            </Dialog.Body>

            <Dialog.Footer borderTopWidth="1px" borderColor="border.subtle" gap={2}>
              <Button variant="outline" borderColor="border.subtle" onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorPalette={accentPalette}
                disabled={!canSubmit}
                loading={createMutation.isPending}
                onClick={() => void handleSubmit()}
              >
                Create rule
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export function AgentRulesPanel() {
  const accentPalette = useAccentPalette()
  const [category, setCategory] = useState<RuleCategoryFilter>('all')
  const [detailRuleId, setDetailRuleId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const rulesQuery = useGatewayRulesQuery()
  const setEnabledMutation = useSetEnabledRulesMutation()

  const items = rulesQuery.data?.items ?? []
  const enabledIds = rulesQuery.data?.enabled ?? []

  const detailRule = useMemo(
    () => items.find((r) => r.id === detailRuleId) ?? null,
    [items, detailRuleId],
  )

  const enabledCount = items.filter((r) => r.enabled).length
  const customCount = items.filter((r) => r.kind === 'custom').length

  const list = useStoreListState(9)
  const filtered = useMemo(() => filterRulesByCategory(items, category), [items, category])
  const searched = useMemo(() => searchRules(filtered, list.search), [filtered, list.search])
  const paged = useStorePagedList(searched, list)

  const busy = setEnabledMutation.isPending

  async function handleToggle(ruleId: string, on: boolean) {
    const next = new Set(enabledIds)
    if (on) next.add(ruleId)
    else next.delete(ruleId)
    await setEnabledMutation.mutateAsync([...next])
  }

  const error = setEnabledMutation.error

  return (
    <>
      <Toolbar
        title="Agent rules"
        description="Control gateway AI behavior with RULE.md policies injected into the system prompt"
        actions={
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              borderRadius="input"
              loading={rulesQuery.isFetching}
              onClick={() => void rulesQuery.refetch()}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button
              size="sm"
              colorPalette={accentPalette}
              borderRadius="input"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} />
              Custom rule
            </Button>
          </HStack>
        }
      />

      <HStack mb={4} gap={3} flexWrap="wrap" fontSize="sm" color="fg.muted">
        <Text>
          <Text as="span" fontWeight="semibold" color="fg.default">
            {enabledCount}
          </Text>{' '}
          enabled
        </Text>
        <Text>·</Text>
        <Text>
          <Text as="span" fontWeight="semibold" color="fg.default">
            {items.length}
          </Text>{' '}
          total
        </Text>
        <Text>·</Text>
        <Text>
          <Text as="span" fontWeight="semibold" color="fg.default">
            {customCount}
          </Text>{' '}
          custom
        </Text>
      </HStack>

      {error ? (
        <SectionCard mb={4} p={3} borderColor="red.500">
          <Text fontSize="sm" color="red.500">
            {String((error as Error).message || error)}
          </Text>
        </SectionCard>
      ) : null}

      <AgentRuleDetailDrawer
        rule={detailRule}
        busy={busy}
        onClose={() => setDetailRuleId(null)}
        onToggle={(id, on) => void handleToggle(id, on)}
        onDeleted={() => setDetailRuleId(null)}
      />

      <AgentRuleCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => setDetailRuleId(id)}
      />

      <StoreFilterBar
        showCategoryFilters
        categoryFilters={RULE_CATEGORY_FILTERS}
        category={category}
        onCategoryChange={(value) => setCategory(value as RuleCategoryFilter)}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search rules…"
        viewMode="grid"
        onViewModeChange={() => undefined}
      />

      <Separator my={4} borderColor="border.subtle" />

      {rulesQuery.isLoading ? (
        <CardGridSkeleton count={6} />
      ) : paged.total === 0 ? (
        <DataListEmpty>No rules match your filters.</DataListEmpty>
      ) : (
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }} gap={3}>
          {paged.items.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              busy={busy}
              onToggle={(id, on) => void handleToggle(id, on)}
              onDetails={setDetailRuleId}
            />
          ))}
        </Grid>
      )}

      <StorePagination
        page={paged.page}
        totalPages={paged.totalPages}
        total={paged.total}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
      />
    </>
  )
}
