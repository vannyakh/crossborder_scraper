import { Toolbar } from '../components/layout/Toolbar'
import {
  ServiceSupportSection,
  SupportRefreshButton,
} from '../components/service/ServiceSectionPanels'

export function SupportPage() {
  return (
    <>
      <Toolbar
        title="Support"
        description="Server readiness, cron scheduler, and quick navigation"
        actions={<SupportRefreshButton />}
      />
      <ServiceSupportSection />
    </>
  )
}
