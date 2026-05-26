import { Box, Button, Separator, Text } from '@chakra-ui/react'
import { RefreshCw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Navigate, useParams } from 'react-router-dom'
import { ArtifactFilesPanel } from '../components/artifact/ArtifactFilesPanel'
import { ArtifactProductsPanel } from '../components/artifact/ArtifactProductsPanel'
import { ArtifactTabNav } from '../components/artifact/ArtifactTabNav'
import {
  ARTIFACT_PAGE,
  ARTIFACT_SECTION_MAP,
  DEFAULT_ARTIFACT_SECTION,
  artifactSectionPath,
  isArtifactSectionId,
  type ArtifactSectionId,
} from '../components/artifact/artifact-sections'
import { Toolbar } from '../components/layout/Toolbar'
import { SectionCard } from '../components/ui/Section'
import { useFilesQuery, useProductsQuery, useRuntimeStatusQuery, useStatsQuery } from '../hooks'
import { useMotionEnabled, useMotionTransition } from '../hooks/use-motion-props'

const MotionBox = motion.create(Box)

function ArtifactSectionContent({ section }: { section: ArtifactSectionId }) {
  switch (section) {
    case 'products':
      return <ArtifactProductsPanel />
    case 'files':
      return <ArtifactFilesPanel />
    default:
      return null
  }
}

export function ArtifactPage() {
  const { section: sectionParam } = useParams<{ section?: string }>()
  const section = isArtifactSectionId(sectionParam) ? sectionParam : DEFAULT_ARTIFACT_SECTION
  const meta = ARTIFACT_SECTION_MAP[section]
  const motionEnabled = useMotionEnabled()
  const transition = useMotionTransition(0.2)

  const stats = useStatsQuery()
  const runtime = useRuntimeStatusQuery()
  const products = useProductsQuery(1, 0)
  const files = useFilesQuery()

  const refreshing =
    stats.isFetching || runtime.isFetching || products.isFetching || files.isFetching

  function refreshAll() {
    void stats.refetch()
    void runtime.refetch()
    void products.refetch()
    void files.refetch()
  }

  if (sectionParam && !isArtifactSectionId(sectionParam)) {
    return <Navigate to={artifactSectionPath(DEFAULT_ARTIFACT_SECTION)} replace />
  }

  const storage = runtime.data?.storage
  const tabCounts = {
    products: storage?.products ?? stats.data?.products ?? products.data?.total,
    files: storage?.output_files ?? stats.data?.output_files ?? files.data?.items.length,
  }

  return (
    <>
      <Toolbar
        title={ARTIFACT_PAGE.title}
        description={ARTIFACT_PAGE.description}
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

      <ArtifactTabNav counts={tabCounts} />

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
            <ArtifactSectionContent section={section} />
          </MotionBox>
        </AnimatePresence>
      </SectionCard>
    </>
  )
}
