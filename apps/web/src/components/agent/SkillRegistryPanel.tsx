import {
  Box,
  Button,
  ButtonGroup,
  Grid,
  HStack,
  Separator,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { DataListEmpty } from '../ui/DataList'
import { CardGridSkeleton, ListCardRowsSkeleton } from '../ui/PanelSkeleton'
import { SectionCard, SubtitleText } from '../ui/Section'
import {
  useInstallRegistrySkillMutation,
  useSetEnabledSkillsMutation,
  useSkillRegistryQuery,
  useUpdateRegistrySkillMutation,
} from '../../hooks/queries/use-agent-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { SkillRegistryItem } from '../../lib/api'
import {
  REGISTRY_SORT_OPTIONS,
  SkillRegistryFilterBar,
  type RegistrySort,
} from './SkillRegistryFilterBar'
import { SkillRegistryCard } from './SkillRegistryCard'
import type { SkillRegistryKind } from './skill-utils'

function RegistryListRow({
  item,
  installing,
  busy,
  onInstall,
  onUpdate,
  onEnable,
  onOpenLocal,
}: {
  item: SkillRegistryItem
  installing: boolean
  busy: boolean
  onInstall: (slug: string, version: string) => void
  onUpdate: (slug: string, version: string) => void
  onEnable: (slug: string) => void
  onOpenLocal: (slug: string) => void
}) {
  return (
    <Box p={4} borderBottomWidth="1px" borderColor="border.subtle" _last={{ borderBottomWidth: 0 }}>
      <SkillRegistryCard
        item={item}
        installing={installing}
        busy={busy}
        onInstall={onInstall}
        onUpdate={onUpdate}
        onEnable={onEnable}
        onOpenLocal={onOpenLocal}
      />
    </Box>
  )
}

export function SkillRegistryPanel({
  enabledIds,
  busy: parentBusy,
  onOpenLocal,
}: {
  enabledIds: string[]
  busy: boolean
  onOpenLocal: (slug: string) => void
}) {
  const accentPalette = useAccentPalette()
  const [registryKind, setRegistryKind] = useState<SkillRegistryKind>('skill')
  const [sort, setSort] = useState<RegistrySort>('downloads')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null])
  const [installingSlug, setInstallingSlug] = useState<string | null>(null)

  const installMutation = useInstallRegistrySkillMutation()
  const updateMutation = useUpdateRegistrySkillMutation()
  const setEnabledMutation = useSetEnabledSkillsMutation()

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setCursor(null)
    setCursorStack([null])
  }, [registryKind, sort, searchQuery])

  const registryQuery = useSkillRegistryQuery({
    kind: registryKind,
    sort,
    limit: 24,
    cursor,
    q: searchQuery || undefined,
  })

  const items = registryQuery.data?.items ?? []
  const nextCursor = registryQuery.data?.next_cursor ?? null

  const busy =
    parentBusy ||
    installMutation.isPending ||
    updateMutation.isPending ||
    setEnabledMutation.isPending ||
    registryQuery.isFetching

  async function handleInstall(slug: string, version: string) {
    setInstallingSlug(slug)
    try {
      await installMutation.mutateAsync({ slug, version, replace: false })
      onOpenLocal(slug)
    } finally {
      setInstallingSlug(null)
    }
  }

  async function handleEnable(slug: string) {
    const next = new Set(enabledIds)
    next.add(slug)
    await setEnabledMutation.mutateAsync([...next])
  }

  async function handleUpdate(slug: string, version: string) {
    setInstallingSlug(slug)
    try {
      await updateMutation.mutateAsync({ slug, version })
      onOpenLocal(slug)
    } finally {
      setInstallingSlug(null)
    }
  }

  function handleNextPage() {
    if (!nextCursor) return
    setCursorStack((stack) => [...stack, nextCursor])
    setCursor(nextCursor)
  }

  function handlePrevPage() {
    if (cursorStack.length <= 1) return
    const nextStack = cursorStack.slice(0, -1)
    setCursorStack(nextStack)
    setCursor(nextStack[nextStack.length - 1] ?? null)
  }

  return (
    <Box>
      <SkillRegistryFilterBar
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={
          registryKind === 'skill' ? 'Search registry skills…' : 'Search registry plugins…'
        }
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        registryKind={registryKind}
        onRegistryKindChange={setRegistryKind}
        sort={sort}
        onSortChange={setSort}
      />

      <Separator my={4} borderColor="border.subtle" />

      {registryQuery.isLoading ? (
        viewMode === 'grid' ? <CardGridSkeleton count={6} /> : <ListCardRowsSkeleton rows={5} />
      ) : registryQuery.isError ? (
        <SectionCard p={4} borderColor="red.500">
          <SubtitleText color="red.500">
            {String((registryQuery.error as Error).message || registryQuery.error)}
          </SubtitleText>
        </SectionCard>
      ) : items.length === 0 ? (
        <DataListEmpty>No registry results match your search.</DataListEmpty>
      ) : viewMode === 'grid' ? (
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }} gap={3}>
          {items.map((item) => (
            <SkillRegistryCard
              key={`${item.kind}-${item.slug}`}
              item={item}
              installing={installingSlug === item.slug}
              busy={busy}
              onInstall={handleInstall}
              onUpdate={handleUpdate}
              onEnable={handleEnable}
              onOpenLocal={onOpenLocal}
            />
          ))}
        </Grid>
      ) : (
        <SectionCard p={0} overflow="hidden">
          {items.map((item) => (
            <RegistryListRow
              key={`${item.kind}-${item.slug}`}
              item={item}
              installing={installingSlug === item.slug}
              busy={busy}
              onInstall={handleInstall}
              onUpdate={handleUpdate}
              onEnable={handleEnable}
              onOpenLocal={onOpenLocal}
            />
          ))}
        </SectionCard>
      )}

      {!searchQuery && (cursorStack.length > 1 || nextCursor) ? (
        <HStack mt={4} pt={4} borderTopWidth="1px" borderColor="border.subtle" justify="space-between">
          <SubtitleText>
            Page {cursorStack.length}
            {registryKind === 'skill'
              ? ` · ${REGISTRY_SORT_OPTIONS.find((o) => o.value === sort)?.label}`
              : ''}
          </SubtitleText>
          <ButtonGroup size="xs" variant="outline">
            <Button
              borderColor="border.subtle"
              borderRadius="input"
              disabled={cursorStack.length <= 1 || busy}
              onClick={handlePrevPage}
            >
              Previous
            </Button>
            <Button
              borderColor="border.subtle"
              borderRadius="input"
              colorPalette={accentPalette}
              disabled={!nextCursor || busy}
              onClick={handleNextPage}
            >
              Next
            </Button>
          </ButtonGroup>
        </HStack>
      ) : null}
    </Box>
  )
}
