import { Box, Button, Grid, HStack, Separator, Tabs, Text } from '@chakra-ui/react'
import { RefreshCw, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Toolbar } from '../layout/Toolbar'
import { StoreFilterBar } from '../store/StoreFilterBar'
import { StorePagination } from '../store/StorePagination'
import { useStoreListState, useStorePagedList } from '../store/store-utils'
import { DataListEmpty } from '../ui/DataList'
import { CardGridSkeleton, ListCardRowsSkeleton } from '../ui/PanelSkeleton'
import { SectionCard } from '../ui/Section'
import {
  useGatewaySkillsQuery,
  useInstallSkillMutation,
  useSetEnabledSkillsMutation,
  useUninstallSkillMutation,
} from '../../hooks/queries/use-agent-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { GatewaySkill } from '../../lib/api'
import { SkillCatalogCard } from './SkillCatalogCard'
import { SkillCatalogListRow } from './SkillCatalogListRow'
import { SkillDetailDrawer } from './SkillDetailDrawer'
import {
  filterSkillsByCategory,
  filterSkillsByTab,
  searchSkills,
  SKILL_CATEGORY_FILTERS,
  type SkillCategoryFilter,
  type SkillTab,
} from './skill-utils'

function SkillsTabContent({
  loading,
  items,
  enabledIds,
  category,
  onCategoryChange,
  busy,
  onToggle,
  onDetails,
}: {
  loading: boolean
  items: GatewaySkill[]
  enabledIds: string[]
  category: SkillCategoryFilter
  onCategoryChange: (value: SkillCategoryFilter) => void
  busy: boolean
  onToggle: (id: string, enabled: boolean) => void
  onDetails: (id: string) => void
}) {
  const list = useStoreListState(6)
  const filtered = useMemo(
    () => filterSkillsByCategory(items, category),
    [items, category],
  )
  const searched = useMemo(() => searchSkills(filtered, list.search), [filtered, list.search])
  const paged = useStorePagedList(searched, list)

  if (loading) {
    return list.viewMode === 'grid' ? <CardGridSkeleton count={6} /> : <ListCardRowsSkeleton rows={5} />
  }

  return (
    <Box>
      <Text fontSize="sm" color="fg.muted" mb={3}>
        {enabledIds.length} enabled · built-in skills live in <code>skills/</code> · custom in{' '}
        <code>installed_skills/</code>
      </Text>

      <StoreFilterBar
        showCategoryFilters
        categoryFilters={SKILL_CATEGORY_FILTERS}
        category={category}
        onCategoryChange={(value) => onCategoryChange(value as SkillCategoryFilter)}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search skills…"
        viewMode={list.viewMode}
        onViewModeChange={list.setViewMode}
      />

      <Separator my={4} borderColor="border.subtle" />

      {paged.total === 0 ? (
        <DataListEmpty>No skills match your filters.</DataListEmpty>
      ) : list.viewMode === 'grid' ? (
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }} gap={3}>
          {paged.items.map((skill) => (
            <SkillCatalogCard
              key={skill.id}
              skill={skill}
              busy={busy}
              onToggle={onToggle}
              onDetails={onDetails}
            />
          ))}
        </Grid>
      ) : (
        <SectionCard p={0} overflow="hidden">
          {paged.items.map((skill) => (
            <SkillCatalogListRow
              key={skill.id}
              skill={skill}
              busy={busy}
              onToggle={onToggle}
              onDetails={onDetails}
            />
          ))}
        </SectionCard>
      )}

      <StorePagination
        page={paged.page}
        totalPages={paged.totalPages}
        total={paged.total}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
      />
    </Box>
  )
}

export function AgentSkillsPanel() {
  const accentPalette = useAccentPalette()
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<SkillTab>('catalog')
  const [category, setCategory] = useState<SkillCategoryFilter>('all')
  const [detailSkillId, setDetailSkillId] = useState<string | null>(null)

  const skillsQuery = useGatewaySkillsQuery()
  const setEnabledMutation = useSetEnabledSkillsMutation()
  const installMutation = useInstallSkillMutation()
  const uninstallMutation = useUninstallSkillMutation()

  const items = skillsQuery.data?.items ?? []
  const enabledIds = skillsQuery.data?.enabled ?? []

  const detailSkill = useMemo(
    () => items.find((s) => s.id === detailSkillId) ?? null,
    [items, detailSkillId],
  )

  const enabledCount = items.filter((s) => s.enabled).length
  const customCount = items.filter((s) => s.kind === 'installed').length

  const busy =
    setEnabledMutation.isPending ||
    installMutation.isPending ||
    uninstallMutation.isPending

  async function handleToggle(skillId: string, on: boolean) {
    const next = new Set(enabledIds)
    if (on) next.add(skillId)
    else next.delete(skillId)
    await setEnabledMutation.mutateAsync([...next])
  }

  async function handleUpload(file: File) {
    try {
      await installMutation.mutateAsync({ file, replace: false })
      setTab('custom')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleUninstall(skillId: string) {
    await uninstallMutation.mutateAsync(skillId)
    setDetailSkillId(null)
  }

  const error = installMutation.error ?? uninstallMutation.error ?? setEnabledMutation.error

  return (
    <>
      <Toolbar
        title="Agent skills"
        description="SKILL.md packages — instructions and tool scope for the gateway agent"
        actions={
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              borderRadius="input"
              loading={skillsQuery.isFetching}
              onClick={() => void skillsQuery.refetch()}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button
              size="sm"
              colorPalette={accentPalette}
              borderRadius="input"
              loading={installMutation.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={14} />
              Install ZIP
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleUpload(f)
              }}
            />
          </HStack>
        }
      />

      {error ? (
        <SectionCard mb={4} p={3} borderColor="red.500">
          <Text fontSize="sm" color="red.500">
            {String((error as Error).message || error)}
          </Text>
        </SectionCard>
      ) : null}

      <SkillDetailDrawer
        skill={detailSkill}
        busy={busy}
        onClose={() => setDetailSkillId(null)}
        onToggle={(id, on) => void handleToggle(id, on)}
        onUninstall={(id) => void handleUninstall(id)}
      />

      <Tabs.Root
        value={tab}
        onValueChange={(d) => setTab((d.value as SkillTab) ?? 'catalog')}
        variant="line"
        size="sm"
      >
        <Tabs.List mb={3}>
          <Tabs.Trigger value="catalog">
            Catalog
            <Box as="span" ml={1.5} fontSize="xs" color="fg.muted">
              {items.length}
            </Box>
          </Tabs.Trigger>
          <Tabs.Trigger value="enabled">
            Enabled
            <Box as="span" ml={1.5} fontSize="xs" color="fg.muted">
              {enabledCount}
            </Box>
          </Tabs.Trigger>
          <Tabs.Trigger value="custom">
            Custom
            <Box as="span" ml={1.5} fontSize="xs" color="fg.muted">
              {customCount}
            </Box>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="catalog" pt={0}>
          <SkillsTabContent
            loading={skillsQuery.isLoading}
            items={filterSkillsByTab(items, 'catalog')}
            enabledIds={enabledIds}
            category={category}
            onCategoryChange={setCategory}
            busy={busy}
            onToggle={(id, on) => void handleToggle(id, on)}
            onDetails={setDetailSkillId}
          />
        </Tabs.Content>

        <Tabs.Content value="enabled" pt={0}>
          <SkillsTabContent
            loading={skillsQuery.isLoading}
            items={filterSkillsByTab(items, 'enabled')}
            enabledIds={enabledIds}
            category={category}
            onCategoryChange={setCategory}
            busy={busy}
            onToggle={(id, on) => void handleToggle(id, on)}
            onDetails={setDetailSkillId}
          />
        </Tabs.Content>

        <Tabs.Content value="custom" pt={0}>
          <SkillsTabContent
            loading={skillsQuery.isLoading}
            items={filterSkillsByTab(items, 'custom')}
            enabledIds={enabledIds}
            category={category}
            onCategoryChange={setCategory}
            busy={busy}
            onToggle={(id, on) => void handleToggle(id, on)}
            onDetails={setDetailSkillId}
          />
        </Tabs.Content>
      </Tabs.Root>
    </>
  )
}
