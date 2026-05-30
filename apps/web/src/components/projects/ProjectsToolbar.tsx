import { Box, HStack, IconButton, Text } from '@chakra-ui/react'
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { PanelSelect } from '../ui/PanelSelect'

export type ProjectsViewMode = 'grid' | 'list'
export type ProjectsSort = 'recent' | 'name' | 'status'

export function ProjectsToolbar({
  count,
  sort,
  viewMode,
  onSortChange,
  onViewModeChange,
}: {
  count: number
  sort: ProjectsSort
  viewMode: ProjectsViewMode
  onSortChange: (sort: ProjectsSort) => void
  onViewModeChange: (mode: ProjectsViewMode) => void
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()

  return (
    <HStack
      justify="space-between"
      align="center"
      flexWrap="wrap"
      gap={3}
      px={{ base: 3, md: 4 }}
      py={3}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      bg="bg.panelHover"
    >
      <HStack gap={2} color="fg.muted" fontSize="sm" minW={0}>
        <LayoutGrid size={16} strokeWidth={2} />
        <Text fontWeight="medium" color="fg">
          {t('projects.count', { count: String(count) })}
        </Text>
      </HStack>

      <HStack gap={2} flexWrap="wrap" justify="flex-end">
        <HStack gap={1.5} fontSize="sm" color="fg.muted">
          <SlidersHorizontal size={14} strokeWidth={2} />
          <Text whiteSpace="nowrap" display={{ base: 'none', sm: 'block' }}>
            {t('projects.sortBy')}
          </Text>
          <Box minW={{ base: '140px', sm: '160px' }}>
            <PanelSelect
              size="sm"
              value={sort}
              onChange={(v) => onSortChange(v as ProjectsSort)}
              options={[
                { value: 'recent', label: t('projects.sortRecent') },
                { value: 'name', label: t('projects.sortName') },
                { value: 'status', label: t('projects.sortStatus') },
              ]}
            />
          </Box>
        </HStack>

        <HStack gap={1} flexShrink={0}>
          <IconButton
            aria-label={t('projects.viewGrid')}
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
            aria-label={t('projects.viewList')}
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
