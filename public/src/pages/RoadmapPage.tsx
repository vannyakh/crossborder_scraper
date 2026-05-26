import { Navigate, useParams } from 'react-router-dom'
import { ComingSoonPanel } from '../components/roadmap/ComingSoonPanel'
import {
  ROADMAP_FEATURES,
  isRoadmapFeatureId,
  roadmapPath,
} from '../components/roadmap/roadmap-sections'

export function RoadmapPage() {
  const { feature } = useParams<{ feature?: string }>()

  if (!isRoadmapFeatureId(feature)) {
    return <Navigate to={roadmapPath(ROADMAP_FEATURES[0].id)} replace />
  }

  return <ComingSoonPanel feature={feature} />
}
