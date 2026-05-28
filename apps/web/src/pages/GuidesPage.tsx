import { Toolbar } from '../components/layout/Toolbar'
import { PanelGuidesPanel } from '../components/guides/PanelGuidesPanel'

export function GuidesPage() {
  return (
    <>
      <Toolbar
        title="Guides"
        description="Setup instructions from libs/guides — agent LLM, scrape workflow, and panel operations"
      />
      <PanelGuidesPanel />
    </>
  )
}
