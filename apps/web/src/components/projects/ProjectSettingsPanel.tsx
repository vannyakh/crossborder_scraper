import { Box, Button, HStack, IconButton, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import { Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCreateProjectTokenMutation,
  usePatchProjectSettingsMutation,
  useProjectSettingsQuery,
  useRevokeProjectTokenMutation,
} from '../../hooks/queries/use-project-settings-query'
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
  const settingsQuery = useProjectSettingsQuery(project.id)
  const updateProject = useUpdateProjectMutation()
  const patchSettings = usePatchProjectSettingsMutation()
  const createToken = useCreateProjectTokenMutation()
  const revokeToken = useRevokeProjectTokenMutation()
  const deleteProject = useDeleteProjectMutation()
  const [section, setSection] = useState<ProjectSettingsSectionId>(DEFAULT_PROJECT_SETTINGS_SECTION)
  const [draft, setDraft] = useState<Partial<ReturnType<typeof buildProjectSettingsForm>>>({})
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [tokenSecretOpen, setTokenSecretOpen] = useState(false)
  const [tokenSecret, setTokenSecret] = useState('')
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const settings = settingsQuery.data

  const serverForm = useMemo(
    () => buildProjectSettingsForm(project, settings?.general.visibility ?? 'private'),
    [project, settings?.general.visibility],
  )
  const form = { ...serverForm, ...draft }

  const patchForm = (patch: Partial<typeof form>) => setDraft((prev) => ({ ...prev, ...patch }))

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
      await patchSettings.mutateAsync({
        projectId: project.id,
        visibility: form.visibility,
      })
      setDraft({})
      notifySuccess(t('projects.settings.general.saved'))
    } catch {
      notifyError(t('projects.settings.general.saveFailed'))
    }
  }

  const onCreateToken = async () => {
    try {
      const res = await createToken.mutateAsync({
        projectId: project.id,
        label: t('projects.settings.tokens.defaultLabel'),
      })
      setTokenSecret(res.secret)
      setTokenSecretOpen(true)
      notifySuccess(t('projects.settings.tokens.created'))
    } catch {
      notifyError(t('projects.settings.tokens.createFailed'))
    }
  }

  const onRevokeToken = async (tokenId: string) => {
    setRevokingId(tokenId)
    try {
      await revokeToken.mutateAsync({ projectId: project.id, tokenId })
      notifySuccess(t('projects.settings.tokens.revoked'))
    } catch {
      notifyError(t('projects.settings.tokens.revokeFailed'))
    } finally {
      setRevokingId(null)
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

  const saving = updateProject.isPending || patchSettings.isPending

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

            {settingsQuery.isLoading && section !== 'general' && section !== 'danger' ? (
              <Box py={12} textAlign="center">
                <Spinner size="sm" color="fg.muted" />
              </Box>
            ) : settingsQuery.isError && section !== 'general' && section !== 'danger' ? (
              <Text color="red.300" fontSize="sm">
                {t('projects.settings.loadFailed')}
              </Text>
            ) : (
              <>
                {section === 'general' ? (
                  <ProjectSettingsGeneralSection
                    form={form}
                    onPatch={patchForm}
                    onSave={() => void onSaveGeneral()}
                    saving={saving}
                  />
                ) : null}
                {section === 'usage' && settings ? (
                  <ProjectSettingsUsageSection usage={settings.usage} />
                ) : null}
                {section === 'environments' ? (
                  <ProjectSettingsEnvironmentsSection project={project} />
                ) : null}
                {section === 'variables' && settings ? (
                  <ProjectSettingsVariablesSection variables={settings.variables} />
                ) : null}
                {section === 'webhooks' && settings ? (
                  <ProjectSettingsWebhooksSection webhooks={settings.webhooks} />
                ) : null}
                {section === 'members' && settings ? (
                  <ProjectSettingsMembersSection members={settings.members} />
                ) : null}
                {section === 'tokens' && settings ? (
                  <ProjectSettingsTokensSection
                    projectId={project.id}
                    tokens={settings.tokens}
                    creating={createToken.isPending}
                    revokingId={revokingId}
                    onCreate={() => void onCreateToken()}
                    onRevoke={(tokenId) => void onRevokeToken(tokenId)}
                  />
                ) : null}
                {section === 'integrations' && settings ? (
                  <ProjectSettingsIntegrationsSection integrations={settings.integrations} />
                ) : null}
                {section === 'danger' ? (
                  <ProjectSettingsDangerSection
                    projectId={project.id}
                    projectName={project.name}
                    deleting={deleteProject.isPending}
                    onDelete={() => setDeleteOpen(true)}
                  />
                ) : null}
              </>
            )}

            {section === 'environments' ? (
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

      <PanelDialog
        open={tokenSecretOpen}
        onClose={() => setTokenSecretOpen(false)}
        title={t('projects.settings.tokens.secretTitle')}
        footer={
          <Button size="sm" onClick={() => setTokenSecretOpen(false)}>
            {t('projects.settings.tokens.secretDone')}
          </Button>
        }
      >
        <Text fontSize="sm" color="fg.muted" mb={3}>
          {t('projects.settings.tokens.secretHint')}
        </Text>
        <HStack gap={2}>
          <Input size="sm" readOnly fontFamily="mono" value={tokenSecret} flex={1} />
          <IconButton
            aria-label={t('projects.settings.tokens.copySecret')}
            size="sm"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(tokenSecret).then(
                () => notifySuccess(t('projects.settings.tokens.copiedSecret')),
                () => undefined,
              )
            }}
          >
            <Copy size={14} />
          </IconButton>
        </HStack>
      </PanelDialog>
    </>
  )
}
