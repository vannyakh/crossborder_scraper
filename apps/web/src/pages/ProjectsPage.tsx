import { Button, VStack } from '@chakra-ui/react'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProjectCreateDialog } from '../components/projects/ProjectCreateDialog'
import { ProjectsListPanel } from '../components/projects/ProjectsListPanel'
import {
  SAMPLE_PROJECTS,
  type ProjectDetail,
  type ProjectEnvironment,
  type ProjectNodeKind,
} from '../components/projects/project-sample-data'
import { PageHeader } from '../components/ui/PageHeader'
import { useLocale } from '../hooks/use-locale'
import { useAccentPalette } from '../hooks/use-ui-config'
import { notifySuccess } from '../lib/toast'
import { projectPath } from '../routes/route-config'

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'project'
  )
}

function newSampleProject(name: string, environment: ProjectEnvironment): ProjectDetail {
  const id = `${slugify(name)}-${Date.now().toString(36).slice(-4)}`
  const nodes = [
    { id: 'n1', kind: 'scrape' as ProjectNodeKind, label: 'Start', x: 120, y: 140 },
    { id: 'n2', kind: 'agent' as ProjectNodeKind, label: 'Agent', x: 360, y: 140 },
  ]
  return {
    id,
    name,
    environment,
    servicesOnline: 0,
    servicesTotal: 2,
    updatedAt: new Date().toISOString(),
    previewNodes: [
      { id: 'n1', kind: 'scrape' as ProjectNodeKind, label: 'Start', x: 28, y: 38 },
      { id: 'n2', kind: 'agent' as ProjectNodeKind, label: 'Agent', x: 68, y: 38 },
    ],
    previewEdges: [{ id: 'e1', from: 'n1', to: 'n2' }],
    nodes,
    edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
  }
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const [projects, setProjects] = useState<ProjectDetail[]>(SAMPLE_PROJECTS)
  const [createOpen, setCreateOpen] = useState(false)

  const handleCreate = (name: string, environment: ProjectEnvironment) => {
    const created = newSampleProject(name, environment)
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
