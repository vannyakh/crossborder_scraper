import { PanelComingSoon } from '../ui/PanelComingSoon'
import { COMING_SOON_BLURB, ROADMAP_FEATURE_MAP, type RoadmapFeatureId } from './roadmap-sections'

export function ComingSoonPanel({ feature }: { feature: RoadmapFeatureId }) {
  const item = ROADMAP_FEATURE_MAP[feature]

  return (
    <PanelComingSoon title={item.label} icon={item.icon} blurb={COMING_SOON_BLURB} />
  )
}
