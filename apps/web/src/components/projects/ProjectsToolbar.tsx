import { Box, ButtonGroup, HStack, IconButton, Text } from '@chakra-ui/react'
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react'
import { PanelSelect } from '../ui/PanelSelect'
import { useLocale } from '../../hooks/use-locale'

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

  return (
    <HStack justify="space-between" flexWrap="wrap" gap={3} mb={4}>
      <HStack gap={2} color="fg.muted" fontSize="sm">
        <LayoutGrid size={16} />
        <Text>{t('projects.count', { count: String(count) })}</Text>
      </HStack>

      <HStack gap={2} flexWrap="wrap">
        <HStack gap={1.5} fontSize="sm" color="fg.muted">
          <SlidersHorizontal size={14} />
          <Text whiteSpace="nowrap">{t('projects.sortBy')}</Text>
          <Box minW="160px">
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

        <ButtonGroup size="sm" variant="outline" attached>
          <IconButton
            aria-label={t('projects.viewGrid')}
            bg={viewMode === 'grid' ? 'bg.panelHover' : undefined}
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid size={14} />
          </IconButton>
          <IconButton
            aria-label={t('projects.viewList')}
            bg={viewMode === 'list' ? 'bg.panelHover' : undefined}
            onClick={() => onViewModeChange('list')}
          >
            <List size={14} />
          </IconButton>
        </ButtonGroup>
      </HStack>
    </HStack>
  )
}
