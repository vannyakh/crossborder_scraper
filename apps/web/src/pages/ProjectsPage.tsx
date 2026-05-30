import { Button, Spinner, VStack } from '@chakra-ui/react'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProjectCreateDialog } from '../components/projects/ProjectCreateDialog'
import { ProjectsListPanel } from '../components/projects/ProjectsListPanel'
import type { ProjectEnvironment } from '../components/projects/project-sample-data'
import { PageHeader } from '../components/ui/PageHeader'
import { DataListEmpty } from '../components/ui/DataList'
import { useCreateProjectMutation, useProjectsListQuery } from '../hooks/queries/use-projects-query'
import { useLocale } from '../hooks/use-locale'
import { useAccentPalette } from '../hooks/use-ui-config'
import { notifyError, notifySuccess } from '../lib/toast'
import { projectPath } from '../routes/route-config'

export function ProjectsPage() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const [createOpen, setCreateOpen] = useState(false)
  const { data, isLoading, isError, refetch } = useProjectsListQuery()
  const createProject = useCreateProjectMutation()

  const handleCreate = async (name: string, environment: ProjectEnvironment) => {
    try {
      const created = await createProject.mutateAsync({ name, environment })
      notifySuccess(t('projects.createDone', { name }))
      navigate(projectPath(created.id))
    } catch {
      notifyError(t('projects.createFailed'))
    }
  }

  const projects = data?.items ?? []

  return (
    <VStack align="stretch" gap={0}>
      <PageHeader
        title={t('projects.title')}
        description={t('projects.description')}
        action={
          <Button
            size="sm"
            colorPalette={accentPalette}
            loading={createProject.isPending}
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} />
            {t('projects.new')}
          </Button>
        }
      />

      {isLoading ? (
        <VStack py={12}>
          <Spinner size="lg" />
        </VStack>
      ) : isError ? (
        <VStack py={12} gap={3}>
          <DataListEmpty>{t('projects.loadFailed')}</DataListEmpty>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            {t('common.retry')}
          </Button>
        </VStack>
      ) : (
        <ProjectsListPanel projects={projects} />
      )}

      <ProjectCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </VStack>
  )
}
