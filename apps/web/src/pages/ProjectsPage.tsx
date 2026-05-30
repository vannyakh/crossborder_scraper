import { Button, VStack } from '@chakra-ui/react'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProjectCreateDialog } from '../components/projects/ProjectCreateDialog'
import { createStarterProject } from '../components/projects/project-mock-data'
import { ProjectsListPanel } from '../components/projects/ProjectsListPanel'
import {
  SAMPLE_PROJECTS,
  type ProjectDetail,
  type ProjectEnvironment,
} from '../components/projects/project-sample-data'
import { PageHeader } from '../components/ui/PageHeader'
import { useLocale } from '../hooks/use-locale'
import { useAccentPalette } from '../hooks/use-ui-config'
import { notifySuccess } from '../lib/toast'
import { projectPath } from '../routes/route-config'

export function ProjectsPage() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const [projects, setProjects] = useState<ProjectDetail[]>(SAMPLE_PROJECTS)
  const [createOpen, setCreateOpen] = useState(false)

  const handleCreate = (name: string, environment: ProjectEnvironment) => {
    const created = createStarterProject(name, environment)
    setProjects((prev) => [created, ...prev])
    notifySuccess(t('projects.createDone', { name }))
    navigate(projectPath(created.id), { state: { project: created } })
  }

  return (
    <VStack align="stretch" gap={0}>
      <PageHeader
        title={t('projects.title')}
        description={t('projects.description')}
        action={
          <Button size="sm" colorPalette={accentPalette} onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            {t('projects.new')}
          </Button>
        }
      />

      <ProjectsListPanel projects={projects} />

      <ProjectCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </VStack>
  )
}
