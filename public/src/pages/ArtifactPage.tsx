import { Button } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { ArtifactFilesPanel } from '../components/artifact/ArtifactFilesPanel'
import { ArtifactProductsPanel } from '../components/artifact/ArtifactProductsPanel'
import {
  ARTIFACT_SECTION_MAP,
  DEFAULT_ARTIFACT_SECTION,
  artifactSectionPath,
  isArtifactSectionId,
  type ArtifactSectionId,
} from '../components/artifact/artifact-sections'
import { Toolbar } from '../components/layout/Toolbar'
import { SectionCard } from '../components/ui/Section'
import { queryKeys } from '../lib/api'

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
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    setRefreshing(true)
    try {
      if (section === 'products') {
        await queryClient.invalidateQueries({ queryKey: ['products'] })
      } else {
        await queryClient.invalidateQueries({ queryKey: queryKeys.files })
      }
    } finally {
      setRefreshing(false)
    }
  }

  if (sectionParam && !isArtifactSectionId(sectionParam)) {
    return <Navigate to={artifactSectionPath(DEFAULT_ARTIFACT_SECTION)} replace />
  }

  return (
    <>
      <Toolbar
        title={meta.label}
        description={meta.description}
        actions={
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            loading={refreshing}
            onClick={refresh}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        }
      />
      <SectionCard p={{ base: 3, md: 4 }} mb={0}>
        <ArtifactSectionContent section={section} />
      </SectionCard>
    </>
  )
}
