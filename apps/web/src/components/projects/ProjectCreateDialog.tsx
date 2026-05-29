import { Box, Button, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { PanelDialog } from '../ui/PanelDialog'
import { PanelSelect } from '../ui/PanelSelect'
import { fieldStyles } from '../ui/field-styles'
import type { ProjectEnvironment } from './project-sample-data'

export function ProjectCreateDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, environment: ProjectEnvironment) => void
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const [name, setName] = useState('')
  const [environment, setEnvironment] = useState<ProjectEnvironment>('production')

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed, environment)
    setName('')
    setEnvironment('production')
    onClose()
  }

  return (
    <PanelDialog
      open={open}
      onClose={onClose}
      title={t('projects.createTitle')}
      footer={
        <HStack justify="flex-end" gap={2}>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {t('db.create.cancel')}
          </Button>
          <Button size="sm" colorPalette={accentPalette} disabled={!name.trim()} onClick={submit}>
            {t('projects.createConfirm')}
          </Button>
        </HStack>
      }
    >
      <VStack align="stretch" gap={3}>
        <Text fontSize="xs" color="fg.muted">
          {t('projects.createHint')}
        </Text>
        <Box>
          <Text fontSize="xs" color="fg.muted" mb={1}>
            {t('projects.nameLabel')}
          </Text>
          <Input
            {...fieldStyles}
            size="sm"
            value={name}
            placeholder={t('projects.namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
        </Box>
        <Box>
          <Text fontSize="xs" color="fg.muted" mb={1}>
            {t('projects.environmentLabel')}
          </Text>
          <PanelSelect
            size="sm"
            value={environment}
            onChange={(v) => setEnvironment(v as ProjectEnvironment)}
            options={[
              { value: 'production', label: t('projects.envProduction') },
              { value: 'staging', label: t('projects.envStaging') },
              { value: 'development', label: t('projects.envDevelopment') },
            ]}
          />
        </Box>
      </VStack>
    </PanelDialog>
  )
}
