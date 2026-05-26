import { Navigate, useParams } from 'react-router-dom'
import { ComingSoonPanel } from '../components/roadmap/ComingSoonPanel'
import { Toolbar } from '../components/layout/Toolbar'
import {
  ROADMAP_FEATURES,
  ROADMAP_FEATURE_MAP,
  isRoadmapFeatureId,
  roadmapPath,
} from '../components/roadmap/roadmap-sections'

export function RoadmapPage() {
  const { feature } = useParams<{ feature?: string }>()

  if (!isRoadmapFeatureId(feature)) {
    return <Navigate to={roadmapPath(ROADMAP_FEATURES[0].id)} replace />
  }

  const item = ROADMAP_FEATURE_MAP[feature]

  return (
    <>
      <Toolbar title={item.label} description={item.description} />
      <ComingSoonPanel feature={feature} />
    </>
  )
}
