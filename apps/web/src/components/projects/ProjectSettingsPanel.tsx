import { Box, Button, Text, VStack } from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { notifySuccess } from '../../lib/toast'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'
import {
  ProjectSettingsDangerSection,
  ProjectSettingsEnvironmentsSection,
  ProjectSettingsGeneralSection,
  ProjectSettingsIntegrationsSection,
  ProjectSettingsMembersSection,
  ProjectSettingsTokensSection,
  ProjectSettingsUsageSection,
  ProjectSettingsVariablesSection,
  ProjectSettingsWebhooksSection,
} from './ProjectSettingsSections'
import {
  DEFAULT_PROJECT_SETTINGS_SECTION,
  PROJECT_SETTINGS_NAV,
  type ProjectSettingsSectionId,
} from './project-settings-sections'
import { buildProjectSettingsForm } from './project-settings-sample'

export function ProjectSettingsPanel() {
  const { t } = useLocale()
  const { project, setProject } = useProjectWorkspace()
  const [section, setSection] = useState<ProjectSettingsSectionId>(DEFAULT_PROJECT_SETTINGS_SECTION)
  const initialForm = useMemo(() => buildProjectSettingsForm(project), [project.id])
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    setForm(buildProjectSettingsForm(project))
  }, [project])

  const patchForm = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }))

  const onSaveGeneral = () => {
    setProject((prev) => ({ ...prev, name: form.name.trim() || prev.name }))
    notifySuccess(t('projects.settings.general.saved'))
  }

  const sectionTitle = t(
    PROJECT_SETTINGS_NAV.find((item) => item.id === section)?.labelKey ??
      'projects.settings.nav.general',
  )

  return (
    <Box className="project-settings-panel" flex={1} minH={0} display="flex" overflow="hidden">
      <Box
        as="nav"
        className="project-settings-nav"
        aria-label={t('projects.settings.navLabel')}
        flexShrink={0}
      >
        <Text
          className="project-settings-nav__title"
          fontWeight="semibold"
          fontSize="lg"
          px={4}
          pt={4}
          pb={2}
        >
          {t('projects.settings.title')}
        </Text>
        <VStack align="stretch" gap={0.5} px={2} pb={4}>
          {PROJECT_SETTINGS_NAV.map((item) => {
            const Icon = item.icon
            const active = section === item.id
            return (
              <Button
                key={item.id}
                className={
                  active ? 'project-settings-nav__item is-active' : 'project-settings-nav__item'
                }
                variant="ghost"
                justifyContent="flex-start"
                gap={2}
                fontWeight={active ? 'semibold' : 'medium'}
                fontSize="sm"
                color={item.danger ? 'red.300' : active ? 'fg' : 'fg.muted'}
                onClick={() => setSection(item.id)}
              >
                <Icon size={16} strokeWidth={1.75} />
                {t(item.labelKey)}
              </Button>
            )
          })}
        </VStack>
      </Box>

      <Box className="project-settings-main app-scroll" flex={1} minW={0} overflow="auto">
        <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} maxW="3xl">
          <Text fontWeight="semibold" fontSize="lg" mb={4}>
            {sectionTitle}
          </Text>

          {section === 'general' ? (
            <ProjectSettingsGeneralSection form={form} onPatch={patchForm} onSave={onSaveGeneral} />
          ) : null}
          {section === 'usage' ? <ProjectSettingsUsageSection project={project} /> : null}
          {section === 'environments' ? (
            <ProjectSettingsEnvironmentsSection project={project} />
          ) : null}
          {section === 'variables' ? <ProjectSettingsVariablesSection project={project} /> : null}
          {section === 'webhooks' ? <ProjectSettingsWebhooksSection project={project} /> : null}
          {section === 'members' ? <ProjectSettingsMembersSection /> : null}
          {section === 'tokens' ? <ProjectSettingsTokensSection /> : null}
          {section === 'integrations' ? <ProjectSettingsIntegrationsSection /> : null}
          {section === 'danger' ? (
            <ProjectSettingsDangerSection projectName={project.name} />
          ) : null}

          <Text fontSize="xs" color="fg.muted" mt={8}>
            {t('projects.settings.previewNote')}
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
