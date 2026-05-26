import { Toolbar } from '../components/layout/Toolbar'
import { ServiceSupportSection } from '../components/service/ServiceSectionPanels'

export function SupportPage() {
  return (
    <>
      <Toolbar
        title="Support"
        description="Server readiness, cron scheduler, and navigation — backed by GET /service/support"
      />
      <ServiceSupportSection />
    </>
  )
}
