import { HStack, IconButton, Input } from '@chakra-ui/react'
import { LayoutGrid, List, Search } from 'lucide-react'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { SkillPanelSelect } from './SkillPanelSelect'
import type { SkillRegistryKind } from './skill-utils'

export const REGISTRY_KIND_OPTIONS = [
  { label: 'Community skills', value: 'skill' },
  { label: 'Runtime plugins', value: 'plugin' },
] as const

export const REGISTRY_SORT_OPTIONS = [
  { label: 'Most downloaded', value: 'downloads' },
  { label: 'Recently updated', value: 'updated' },
  { label: 'Newest', value: 'newest' },
  { label: 'Most starred', value: 'stars' },
  { label: 'Most installed', value: 'installs' },
] as const

export type RegistrySort = (typeof REGISTRY_SORT_OPTIONS)[number]['value']

export function SkillRegistryFilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  viewMode,
  onViewModeChange,
  registryKind,
  onRegistryKindChange,
  sort,
  onSortChange,
}: {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  registryKind: SkillRegistryKind
  onRegistryKindChange: (kind: SkillRegistryKind) => void
  sort: RegistrySort
  onSortChange: (sort: RegistrySort) => void
}) {
  const accentPalette = useAccentPalette()

  return (
    <HStack gap={3} flexWrap="wrap" align="center" w="full">
      <HStack
        flex={{ base: '1 1 100%', md: '1 1 280px' }}
        minW={{ base: 'full', sm: '200px' }}
        maxW={{ base: 'full', lg: '480px' }}
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-input)"
        px={2}
        bg="bg.input"
      >
        <Search size={14} strokeWidth={2} color="var(--chakra-colors-fg-muted)" />
        <Input
          size="sm"
          variant="flushed"
          border="none"
          flex={1}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </HStack>

      <HStack
        gap={2}
        flexWrap="wrap"
        align="center"
        justify="flex-end"
        flex={{ base: '1 1 100%', md: '0 0 auto' }}
        ml={{ base: 0, md: 'auto' }}
      >
     

        <SkillPanelSelect
          label="Catalog"
          value={registryKind}
          options={[...REGISTRY_KIND_OPTIONS]}
          minW="188px"
          onChange={(value) => onRegistryKindChange(value as SkillRegistryKind)}
        />

        {registryKind === 'skill' ? (
          <SkillPanelSelect
            label="Sort"
            value={sort}
            options={[...REGISTRY_SORT_OPTIONS]}
            minW="176px"
            onChange={(value) => onSortChange(value as RegistrySort)}
          />
        ) : null}
           <HStack gap={1} flexShrink={0}>
          <IconButton
            aria-label="Grid view"
            size="sm"
            variant={viewMode === 'grid' ? 'solid' : 'outline'}
            colorPalette={viewMode === 'grid' ? accentPalette : 'gray'}
            borderColor="border.subtle"
            borderRadius="input"
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid size={16} />
          </IconButton>
          <IconButton
            aria-label="List view"
            size="sm"
            variant={viewMode === 'list' ? 'solid' : 'outline'}
            colorPalette={viewMode === 'list' ? accentPalette : 'gray'}
            borderColor="border.subtle"
            borderRadius="input"
            onClick={() => onViewModeChange('list')}
          >
            <List size={16} />
          </IconButton>
        </HStack>
      </HStack>
    </HStack>
  )
}
