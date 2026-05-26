import { Box } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { Navigate, useParams } from 'react-router-dom'
import {
  AiSettingsSection,
  MarketplacesSettingsSection,
  PanelAppearanceSection,
  PricingSettingsSection,
  ProxySettingsSection,
  ScrapeSettingsSection,
} from '../components/settings/SettingsSectionPanels'
import { SettingsSaveBar } from '../components/settings/SettingsSaveBar'
import {
  DEFAULT_SETTINGS_SECTION,
  isSettingsSectionId,
  settingsSectionPath,
  type SettingsSectionId,
} from '../components/settings/settings-sections'
import { usePanelSettingsForm } from '../components/settings/use-panel-settings-form'
import { useLLMHealthQuery } from '../hooks'
import { useMotionEnabled, useMotionTransition } from '../hooks/use-motion-props'

const MotionBox = motion.create(Box)

function SettingsSectionContent({
  section,
  form,
  health,
}: {
  section: SettingsSectionId
  form: ReturnType<typeof usePanelSettingsForm>
  health: ReturnType<typeof useLLMHealthQuery>['data']
}) {
  switch (section) {
    case 'panel':
      return <PanelAppearanceSection form={form} />
    case 'ai':
      return <AiSettingsSection form={form} health={health} />
    case 'scrape':
      return <ScrapeSettingsSection form={form} />
    case 'proxy':
      return <ProxySettingsSection form={form} />
    case 'pricing':
      return <PricingSettingsSection form={form} />
    case 'marketplaces':
      return <MarketplacesSettingsSection form={form} />
    default:
      return null
  }
}

export function SettingsPage() {
  const { section: sectionParam } = useParams<{ section?: string }>()
  const section = isSettingsSectionId(sectionParam) ? sectionParam : DEFAULT_SETTINGS_SECTION
  const form = usePanelSettingsForm()
  const healthQuery = useLLMHealthQuery(Boolean(form.panel?.ai_enabled))
  const health = form.checkMutation.data ?? healthQuery.data
  const motionEnabled = useMotionEnabled()
  const transition = useMotionTransition(0.2)
  const showTest = section === 'ai'

  if (!isSettingsSectionId(sectionParam)) {
    return <Navigate to={settingsSectionPath(DEFAULT_SETTINGS_SECTION)} replace />
  }

  return (
    <Box flex={1} minW={0} w="full">
      <AnimatePresence mode="wait" initial={false}>
        <MotionBox
          key={section}
          initial={motionEnabled ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={motionEnabled ? { opacity: 0, y: -6 } : undefined}
          transition={transition}
        >
          <SettingsSectionContent section={section} form={form} health={health} />

          {section !== 'panel' ? (
            <SettingsSaveBar
              message={form.message}
              saving={form.updateMutation.isPending}
              testing={form.checkMutation.isPending}
              onSave={() => void form.handleSave()}
              onTestLlm={() => void form.handleHealthCheck()}
              showTest={showTest}
            />
          ) : null}
        </MotionBox>
      </AnimatePresence>
    </Box>
  )
}
