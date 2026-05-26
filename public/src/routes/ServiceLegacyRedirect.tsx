import { Navigate, useParams } from 'react-router-dom'
import { isRoadmapFeatureId, roadmapPath } from '../components/roadmap/roadmap-sections'

/** Redirects old /service/:section URLs after menu restructure */
export function ServiceLegacyRedirect() {
  const { section } = useParams<{ section?: string }>()

  if (!section || section === 'overview') {
    return <Navigate to="/" replace />
  }
  if (section === 'health') {
    return <Navigate to="/health" replace />
  }
  if (section === 'support') {
    return <Navigate to="/support" replace />
  }
  if (isRoadmapFeatureId(section)) {
    return <Navigate to={roadmapPath(section)} replace />
  }

  return <Navigate to="/" replace />
}
