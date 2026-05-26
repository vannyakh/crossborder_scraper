import { Box, Button, ButtonGroup, HStack, IconButton, Input } from '@chakra-ui/react'
import { LayoutGrid, List, Search } from 'lucide-react'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { STORE_CATEGORY_FILTERS, type StoreCategoryFilter, type StoreViewMode } from './store-utils'

export function StoreFilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  viewMode,
  onViewModeChange,
  category,
  onCategoryChange,
  showCategoryFilters = false,
}: {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  viewMode: StoreViewMode
  onViewModeChange: (mode: StoreViewMode) => void
  category?: StoreCategoryFilter
  onCategoryChange?: (value: StoreCategoryFilter) => void
  showCategoryFilters?: boolean
}) {
  const accentPalette = useAccentPalette()

  return (
    <HStack gap={3} flexWrap="wrap" align="center" justify="space-between" w="full">
      {showCategoryFilters && category !== undefined && onCategoryChange ? (
        <ButtonGroup size="xs" variant="outline" attached flexWrap="wrap" flexShrink={0}>
          {STORE_CATEGORY_FILTERS.map((f) => (
            <Button
              key={f.id}
              borderColor="border.subtle"
              borderRadius="input"
              colorPalette={category === f.id ? accentPalette : 'gray'}
              variant={category === f.id ? 'solid' : 'outline'}
              onClick={() => onCategoryChange(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </ButtonGroup>
      ) : (
        <Box flexShrink={0} />
      )}

      <HStack gap={2} flex="1" justify="flex-end" minW={{ base: 'full', md: '280px' }} maxW="lg">
        <HStack
          flex="1"
          minW={{ base: 'full', sm: '200px' }}
          maxW="md"
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
