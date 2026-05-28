import type { LLMHealth } from '../../lib/api'
import { SectionPanelSkeleton } from '../ui/PanelSkeleton'
import { Section } from '../ui/Section'
import { AgentLlmSetupPanel } from './AgentLlmSetupPanel'
import type { PanelSettingsForm } from './use-panel-settings-form'

export function AiLlmSettingsPanel({
  form,
  health,
}: {
  form: PanelSettingsForm
  health?: LLMHealth
}) {
  if (form.isLoading) {
    return (
      <SectionPanelSkeleton
        title="Gateway agent LLM"
        description="Provider, model, and API credentials for the panel agent"
        mt={0}
        fields={5}
      />
    )
  }

  return (
    <Section title="Gateway agent LLM" mt={0}>
      <AgentLlmSetupPanel form={form} health={health} />
    </Section>
  )
}
