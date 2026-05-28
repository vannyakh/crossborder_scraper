import { Box, Button, Grid, Separator, Tabs, Text } from '@chakra-ui/react'
import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Toolbar } from '../layout/Toolbar'
import { DataListEmpty } from '../ui/DataList'
import { CardGridSkeleton, ListCardRowsSkeleton } from '../ui/PanelSkeleton'
import { SectionCard } from '../ui/Section'
import {
  useStoreCatalogQuery,
  useStoreEnvironmentQuery,
  useStoreInstallMutation,
  useStoreInstalledQuery,
} from '../../hooks/queries/use-store-query'
import type { StoreCatalogItem, StoreEnvironment, StoreInstalled } from '../../lib/api'
import { StoreCatalogCard } from './StoreCatalogCard'
import { StoreCatalogListRow } from './StoreCatalogListRow'
import { StoreInstallDialog, type StoreInstallOptions } from './StoreInstallDialog'
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

  const [installTarget, setInstallTarget] = useState<StoreCatalogItem | null>(null)

  const settingsCatalogItem = useMemo(
    () => catalog.data?.find((c) => c.id === settingsPluginId),
    [catalog.data, settingsPluginId],
  )

  const catalogBase = useMemo(
    () => filterCatalog(catalog.data ?? [], category),
    [catalog.data, category],
  )

  const error = installMutation.error

  function isSourceItem(item: StoreCatalogItem) {
    return (
      item.kind === 'source' ||
      item.kind === 'site' ||
      item.category === 'ecommerce' ||
      item.category === 'social' ||
      item.category === 'custom'
    )
  }

  async function handleInstallConfirm(options: StoreInstallOptions) {
    setInstallingId(options.pluginId)
    try {
      await installMutation.mutateAsync({
        pluginId: options.pluginId,
        mode: options.mode,
        version: options.version,
        port: options.port,
      })
      setInstallTarget(null)
      setTab('installed')
    } finally {
      setInstallingId(null)
    }
  }

  function handleInstallClick(id: string) {
    const item = catalog.data?.find((c) => c.id === id)
    if (!item) return
    if (isSourceItem(item)) {
      void handleInstallConfirm({
        pluginId: id,
        mode: 'native',
        version: item.version,
        port: item.default_port,
      })
      return
    }
    setInstallTarget(item)
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

      <StoreInstallDialog
        item={installTarget}
        env={env.data}
        open={Boolean(installTarget)}
        installing={Boolean(installTarget && installingId === installTarget.id)}
        onClose={() => setInstallTarget(null)}
        onConfirm={(options) => void handleInstallConfirm(options)}
      />

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
            env={env.data}
            installingId={installingId}
            catalogBase={catalogBase}
            category={category}
            onCategoryChange={setCategory}
            onInstall={handleInstallClick}
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
  env,
  installingId,
  catalogBase,
  category,
  onCategoryChange,
  onInstall,
  onSettings,
}: {
  loading: boolean
  env?: StoreEnvironment
  installingId: string | null
  catalogBase: StoreCatalogItem[]
  category: StoreCategoryFilter
  onCategoryChange: (value: StoreCategoryFilter) => void
  onInstall: (id: string) => void
  onSettings: (id: string) => void
}) {
  const list = useStoreListState(6)
  const searched = useMemo(
    () => searchCatalog(catalogBase, list.search),
    [catalogBase, list.search],
  )
  const paged = useStorePagedList(searched, list)

  if (loading) {
    return <CardGridSkeleton count={6} />
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
              env={env}
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
              env={env}
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
    return <ListCardRowsSkeleton rows={5} />
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
