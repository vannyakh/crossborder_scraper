import { Box, Button, Separator, Text } from '@chakra-ui/react'
import { RefreshCw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Navigate, useParams } from 'react-router-dom'
import { InventoryBatchesSection } from '../components/inventory/InventoryBatchesSection'
import { InventoryFilesSection } from '../components/inventory/InventoryFilesSection'
import { InventoryOverviewBar } from '../components/inventory/InventoryOverviewBar'
import { InventoryProductsSection } from '../components/inventory/InventoryProductsSection'
import { InventoryTabNav } from '../components/inventory/InventoryTabNav'
import {
  DEFAULT_INVENTORY_SECTION,
  INVENTORY_SECTION_MAP,
  inventorySectionPath,
  isInventorySectionId,
  type InventorySectionId,
} from '../components/inventory/inventory-sections'
import { Toolbar } from '../components/layout/Toolbar'
import { SectionCard } from '../components/ui/Section'
import {
  useBatchesQuery,
  useFilesQuery,
  useProductsQuery,
  useStatsQuery,
} from '../hooks'
import { useMotionEnabled, useMotionTransition } from '../hooks/use-motion-props'

const MotionBox = motion.create(Box)

function InventorySectionContent({ section }: { section: InventorySectionId }) {
  switch (section) {
    case 'batches':
      return <InventoryBatchesSection />
    case 'products':
      return <InventoryProductsSection />
    case 'files':
      return <InventoryFilesSection />
    default:
      return null
  }
}

export function InventoryPage() {
  const { section: sectionParam } = useParams<{ section?: string }>()
  const section = isInventorySectionId(sectionParam) ? sectionParam : DEFAULT_INVENTORY_SECTION
  const meta = INVENTORY_SECTION_MAP[section]
  const motionEnabled = useMotionEnabled()
  const transition = useMotionTransition(0.2)

  const stats = useStatsQuery()
  const batches = useBatchesQuery(50)
  const products = useProductsQuery(1)
  const files = useFilesQuery()

  const refreshing =
    stats.isFetching || batches.isFetching || products.isFetching || files.isFetching

  function refreshAll() {
    void stats.refetch()
    void batches.refetch()
    void products.refetch()
    void files.refetch()
  }

  if (sectionParam && !isInventorySectionId(sectionParam)) {
    return <Navigate to={inventorySectionPath(DEFAULT_INVENTORY_SECTION)} replace />
  }

  const tabCounts = {
    batches: batches.data?.total ?? batches.data?.items.length,
    products: products.data?.total,
    files: files.data?.items.length,
  }

  return (
    <>
      <Toolbar
        title="Inventory"
        description="Scrape pipeline — batches, product catalog, and export files"
        actions={
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            loading={refreshing}
            onClick={refreshAll}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        }
      />

      <InventoryOverviewBar />

      <InventoryTabNav counts={tabCounts} />

      <Box mb={3} mt={4}>
        <Text fontSize="sm" fontWeight="semibold">
          {meta.label}
        </Text>
        <Text fontSize="xs" color="fg.muted" lineClamp={1} truncate title={meta.description}>
          {meta.description}
        </Text>
      </Box>

      <Separator mb={4} borderColor="border.subtle" />

      <SectionCard p={{ base: 3, md: 4 }} mb={0}>
        <AnimatePresence mode="wait" initial={false}>
          <MotionBox
            key={section}
            initial={motionEnabled ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionEnabled ? { opacity: 0, y: -4 } : undefined}
            transition={transition}
          >
            <InventorySectionContent section={section} />
          </MotionBox>
        </AnimatePresence>
      </SectionCard>
    </>
  )
}
