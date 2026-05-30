import { Box, Button, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useDeleteProjectMutation,
  useUpdateProjectMutation,
} from '../../hooks/queries/use-projects-query'
import { useLocale } from '../../hooks/use-locale'
import { notifyError, notifySuccess } from '../../lib/toast'
import { ROUTE_PATHS } from '../../routes/route-config'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'
import { PanelDialog } from '../ui/PanelDialog'
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
  const navigate = useNavigate()
  const { project, setProject } = useProjectWorkspace()
  const updateProject = useUpdateProjectMutation()
  const deleteProject = useDeleteProjectMutation()
  const [section, setSection] = useState<ProjectSettingsSectionId>(DEFAULT_PROJECT_SETTINGS_SECTION)
  const [form, setForm] = useState(() => buildProjectSettingsForm(project))
  const [deleteOpen, setDeleteOpen] = useState(false)

  const patchForm = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }))

  const onSaveGeneral = async () => {
    const name = form.name.trim()
    if (!name) return
    try {
      const saved = await updateProject.mutateAsync({
        projectId: project.id,
        name,
        description: form.description.trim(),
        environment: form.environment,
      })
      setProject(saved)
      setForm(buildProjectSettingsForm(saved))
      notifySuccess(t('projects.settings.general.saved'))
    } catch {
      notifyError(t('projects.settings.general.saveFailed'))
    }
  }

  const onDeleteProject = async () => {
    try {
      await deleteProject.mutateAsync(project.id)
      notifySuccess(t('projects.settings.danger.deleted', { name: project.name }))
      navigate(ROUTE_PATHS.projects.base)
    } catch {
      notifyError(t('projects.settings.danger.deleteFailed'))
    } finally {
      setDeleteOpen(false)
    }
  }

  const sectionTitle = t(
    PROJECT_SETTINGS_NAV.find((item) => item.id === section)?.labelKey ??
      'projects.settings.nav.general',
  )

  return (
    <>
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
              <ProjectSettingsGeneralSection
                form={form}
                onPatch={patchForm}
                onSave={() => void onSaveGeneral()}
                saving={updateProject.isPending}
              />
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
              <ProjectSettingsDangerSection
                projectId={project.id}
                projectName={project.name}
                deleting={deleteProject.isPending}
                onDelete={() => setDeleteOpen(true)}
              />
            ) : null}

            {section !== 'general' && section !== 'danger' ? (
              <Text fontSize="xs" color="fg.muted" mt={8}>
                {t('projects.settings.sectionPreviewNote')}
              </Text>
            ) : null}
          </Box>
        </Box>
      </Box>

      <PanelDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t('projects.settings.danger.confirmTitle')}
        footer={
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button size="sm" variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t('projects.settings.danger.cancel')}
            </Button>
            <Button
              size="sm"
              colorPalette="red"
              loading={deleteProject.isPending}
              onClick={() => void onDeleteProject()}
            >
              {t('projects.settings.danger.confirmDelete')}
            </Button>
          </Box>
        }
      >
        <Text fontSize="sm" color="fg.muted">
          {t('projects.settings.danger.confirmBody', { name: project.name })}
        </Text>
      </PanelDialog>
    </>
  )
}
