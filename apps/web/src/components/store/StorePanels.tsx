import { Box, Button, Grid, Separator, Tabs, Text } from '@chakra-ui/react'
import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Toolbar } from '../layout/Toolbar'
import { DataListEmpty } from '../ui/DataList'
import { SectionCard } from '../ui/Section'
import {
  useStoreCatalogQuery,
  useStoreEnvironmentQuery,
  useStoreInstallMutation,
  useStoreInstalledQuery,
} from '../../hooks/queries/use-store-query'
import type { StoreCatalogItem, StoreInstalled } from '../../lib/api'
import { StoreCatalogCard } from './StoreCatalogCard'
import { StoreCatalogListRow } from './StoreCatalogListRow'
import { StoreEnvironmentBar } from './StoreEnvironmentBar'
import { StorePluginSettingsDrawer } from './StorePluginSettingsDrawer'
import { StoreFilterBar } from './StoreFilterBar'
import { StoreInstalledList } from './StoreInstalledList'
import { StorePagination } from './StorePagination'
import {
  filterCatalog,
  searchCatalog,
  searchInstalled,
  useStoreListState,
  useStorePagedList,
  type StoreCategoryFilter,
} from './store-utils'

export function StorePanels() {
  const env = useStoreEnvironmentQuery()
  const catalog = useStoreCatalogQuery()
  const installed = useStoreInstalledQuery()
  const installMutation = useStoreInstallMutation()

  const [tab, setTab] = useState<'catalog' | 'installed'>('catalog')
  const [category, setCategory] = useState<StoreCategoryFilter>('all')
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [settingsPluginId, setSettingsPluginId] = useState<string | null>(null)

  const dockerReady = Boolean(env.data?.docker_available && env.data?.compose_available)
  const settingsCatalogItem = useMemo(
    () => catalog.data?.find((c) => c.id === settingsPluginId),
    [catalog.data, settingsPluginId],
  )

  const catalogBase = useMemo(
    () => filterCatalog(catalog.data ?? [], category),
    [catalog.data, category],
  )

  const error = installMutation.error

  async function handleInstall(pluginId: string, port: number) {
    setInstallingId(pluginId)
    try {
      await installMutation.mutateAsync({ pluginId, port })
      setTab('installed')
    } finally {
      setInstallingId(null)
    }
  }

  return (
    <>
      <Toolbar
        title="App Store"
        description="E-commerce scrapers, social sources, and infrastructure services — view specs or install"
        actions={
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            loading={catalog.isFetching || installed.isFetching}
            onClick={() => {
              void catalog.refetch()
              void installed.refetch()
              void env.refetch()
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        }
      />

      {error ? (
        <SectionCard mb={4} p={3} borderColor="red.500">
          <Text fontSize="sm" color="red.500">
            {String((error as Error).message || error)}
          </Text>
        </SectionCard>
      ) : null}

      <StoreEnvironmentBar env={env.data} dockerReady={dockerReady} />


      <StorePluginSettingsDrawer
        pluginId={settingsPluginId}
        catalogItem={settingsCatalogItem}
        onClose={() => setSettingsPluginId(null)}
      />

      <Tabs.Root
        value={tab}
        onValueChange={(d) => setTab((d.value as 'catalog' | 'installed') ?? 'catalog')}
        variant="line"
        size="sm"
      >
        <Tabs.List mb={3}>
          <Tabs.Trigger value="catalog">
            Catalog
            <Box as="span" ml={1.5} fontSize="xs" color="fg.muted">
              {catalog.data?.length ?? 0}
            </Box>
          </Tabs.Trigger>
          <Tabs.Trigger value="installed">
            Installed
            <Box as="span" ml={1.5} fontSize="xs" color="fg.muted">
              {installed.data?.length ?? 0}
            </Box>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="catalog" pt={0}>
          <CatalogTabContent
            loading={catalog.isLoading}
            dockerReady={dockerReady}
            installingId={installingId}
            catalogBase={catalogBase}
            category={category}
            onCategoryChange={setCategory}
            onInstall={(id, port) => void handleInstall(id, port)}
            onSettings={setSettingsPluginId}
          />
        </Tabs.Content>

        <Tabs.Content value="installed" pt={0}>
          <InstalledTabContent
            loading={installed.isLoading}
            items={installed.data ?? []}
            onSettings={setSettingsPluginId}
          />
        </Tabs.Content>
      </Tabs.Root>
    </>
  )
}

function CatalogTabContent({
  loading,
  dockerReady,
  installingId,
  catalogBase,
  category,
  onCategoryChange,
  onInstall,
  onSettings,
}: {
  loading: boolean
  dockerReady: boolean
  installingId: string | null
  catalogBase: StoreCatalogItem[]
  category: StoreCategoryFilter
  onCategoryChange: (value: StoreCategoryFilter) => void
  onInstall: (id: string, port: number) => void
  onSettings: (id: string) => void
}) {
  const list = useStoreListState(6)
  const searched = useMemo(() => searchCatalog(catalogBase, list.search), [catalogBase, list.search])
  const paged = useStorePagedList(searched, list)

  if (loading) {
    return <DataListEmpty>Loading catalog…</DataListEmpty>
  }

  return (
    <Box>
      <StoreFilterBar
        showCategoryFilters
        category={category}
        onCategoryChange={onCategoryChange}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search apps…"
        viewMode={list.viewMode}
        onViewModeChange={list.setViewMode}
      />

      <Separator my={4} borderColor="border.subtle" />

      {paged.total === 0 ? (
        <DataListEmpty>No apps match your filters.</DataListEmpty>
      ) : list.viewMode === 'grid' ? (
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }} gap={3}>
          {paged.items.map((item) => (
            <StoreCatalogCard
              key={item.id}
              item={item}
              dockerReady={dockerReady}
              installing={installingId === item.id}
              onInstall={onInstall}
              onSettings={onSettings}
            />
          ))}
        </Grid>
      ) : (
        <SectionCard p={0} overflow="hidden">
          {paged.items.map((item) => (
            <StoreCatalogListRow
              key={item.id}
              item={item}
              dockerReady={dockerReady}
              installing={installingId === item.id}
              onInstall={onInstall}
              onSettings={onSettings}
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

function InstalledTabContent({
  loading,
  items,
  onSettings,
}: {
  loading: boolean
  items: StoreInstalled[]
  onSettings: (id: string) => void
}) {
  const list = useStoreListState(10)
  const searched = useMemo(() => searchInstalled(items, list.search), [items, list.search])
  const paged = useStorePagedList(searched, list)

  if (loading) {
    return <DataListEmpty>Loading installed plugins…</DataListEmpty>
  }

  return (
    <Box>
      <StoreFilterBar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search installed…"
        viewMode={list.viewMode}
        onViewModeChange={list.setViewMode}
      />

      <Separator my={4} borderColor="border.subtle" />

      <StoreInstalledList
        items={paged.items}
        viewMode={list.viewMode}
        loading={false}
        onSettings={onSettings}
      />

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
