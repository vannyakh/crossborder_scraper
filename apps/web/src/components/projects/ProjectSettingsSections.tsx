import {
  Badge,
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  Table,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { Copy } from 'lucide-react'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { notifySuccess } from '../../lib/toast'
import { PanelSelect } from '../ui/PanelSelect'
import { SettingsField } from '../settings/SettingsFields'
import { fieldStyles } from '../ui/field-styles'
import { SubtitleText } from '../ui/Section'
import {
  environmentLabelKey,
  sampleMembers,
  sampleTokens,
  sampleVariables,
  type ProjectSettingsForm,
} from './project-settings-sample'
import type { ProjectDetail, ProjectEnvironment } from './project-sample-data'

function SettingsBlock({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Box className="project-settings-block" mb={8}>
      <Text fontWeight="semibold" fontSize="md" mb={description ? 1 : 3}>
        {title}
      </Text>
      {description ? (
        <SubtitleText mb={3} title={description}>
          {description}
        </SubtitleText>
      ) : null}
      {children}
    </Box>
  )
}

export function ProjectSettingsGeneralSection({
  form,
  onPatch,
  onSave,
  saving,
}: {
  form: ProjectSettingsForm
  onPatch: (patch: Partial<ProjectSettingsForm>) => void
  onSave: () => void
  saving?: boolean
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()

  const environmentOptions = (['production', 'staging', 'development'] as const).map((value) => ({
    value,
    label: t(environmentLabelKey(value)),
  }))

  async function copyId() {
    try {
      await navigator.clipboard.writeText(form.projectId)
      notifySuccess(t('projects.settings.copiedId'))
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <VStack align="stretch" gap={0}>
      <SettingsBlock title={t('projects.settings.general.infoTitle')}>
        <VStack align="stretch" gap={4} maxW="xl">
          <SettingsField label={t('projects.settings.general.name')}>
            <Input
              size="sm"
              value={form.name}
              onChange={(e) => {
                onPatch({ name: e.target.value })
              }}
              {...fieldStyles}
            />
          </SettingsField>
          <SettingsField
            label={t('projects.settings.general.description')}
            hint={t('projects.settings.general.descriptionHint')}
          >
            <Textarea
              size="sm"
              rows={3}
              value={form.description}
              placeholder={t('projects.settings.general.descriptionPlaceholder')}
              onChange={(e) => {
                onPatch({ description: e.target.value })
              }}
              {...fieldStyles}
            />
          </SettingsField>
          <SettingsField label={t('projects.environmentLabel')}>
            <PanelSelect
              value={form.environment}
              options={environmentOptions}
              onChange={(value) => {
                onPatch({ environment: value as ProjectEnvironment })
              }}
            />
          </SettingsField>
          <SettingsField label={t('projects.settings.general.projectId')}>
            <HStack gap={1}>
              <Input
                size="sm"
                readOnly
                value={form.projectId}
                fontFamily="mono"
                fontSize="xs"
                flex={1}
                {...fieldStyles}
              />
              <IconButton
                aria-label={t('projects.settings.general.copyId')}
                size="sm"
                variant="outline"
                onClick={() => void copyId()}
              >
                <Copy size={14} />
              </IconButton>
            </HStack>
          </SettingsField>
          <Button
            size="sm"
            w="fit-content"
            colorPalette={accentPalette}
            loading={saving}
            onClick={onSave}
          >
            {t('projects.settings.general.update')}
          </Button>
        </VStack>
      </SettingsBlock>
    </VStack>
  )
}

export function ProjectSettingsUsageSection({ project }: { project: ProjectDetail }) {
  const { t } = useLocale()
  return (
    <SettingsBlock
      title={t('projects.settings.usage.title')}
      description={t('projects.settings.usage.desc')}
    >
      <HStack gap={3} flexWrap="wrap">
        <UsageStat
          label={t('projects.settings.usage.services')}
          value={`${project.servicesOnline}/${project.servicesTotal}`}
        />
        <UsageStat
          label={t('projects.settings.usage.nodes')}
          value={String(project.nodes.length)}
        />
        <UsageStat
          label={t('projects.settings.usage.env')}
          value={t(environmentLabelKey(project.environment))}
        />
      </HStack>
      <Text fontSize="xs" color="fg.muted" mt={4}>
        {t('projects.settings.usage.runtimeHint')}
      </Text>
    </SettingsBlock>
  )
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <Box
      px={4}
      py={3}
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-card)"
      minW="7rem"
    >
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontWeight="semibold" mt={1}>
        {value}
      </Text>
    </Box>
  )
}

export function ProjectSettingsEnvironmentsSection({ project }: { project: ProjectDetail }) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  return (
    <SettingsBlock
      title={t('projects.settings.environments.title')}
      description={t('projects.settings.environments.desc')}
    >
      <HStack gap={2} mb={4}>
        <Badge colorPalette="green" variant="subtle">
          {t(environmentLabelKey(project.environment))}
        </Badge>
        <Text fontSize="sm" color="fg.muted">
          {t('projects.settings.environments.active')}
        </Text>
      </HStack>
      <Button size="sm" variant="outline" colorPalette={accentPalette} disabled>
        {t('projects.settings.environments.manage')}
      </Button>
    </SettingsBlock>
  )
}

export function ProjectSettingsVariablesSection({ project }: { project: ProjectDetail }) {
  const { t } = useLocale()
  const rows = sampleVariables(project)
  return (
    <SettingsBlock
      title={t('projects.settings.variables.title')}
      description={t('projects.settings.variables.desc')}
    >
      <Table.Root size="sm" variant="line">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>{t('projects.settings.variables.colKey')}</Table.ColumnHeader>
            <Table.ColumnHeader>{t('projects.settings.variables.colScope')}</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => (
            <Table.Row key={row.key}>
              <Table.Cell fontFamily="mono" fontSize="xs">
                {row.key}
              </Table.Cell>
              <Table.Cell>
                <Badge size="sm" variant="subtle">
                  {row.scope === 'shared'
                    ? t('projects.settings.variables.scopeShared')
                    : t('projects.settings.variables.scopeProject')}
                </Badge>
                {row.masked ? (
                  <Text as="span" fontSize="xs" color="fg.muted" ml={2}>
                    ••••••
                  </Text>
                ) : null}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </SettingsBlock>
  )
}

export function ProjectSettingsWebhooksSection({ project }: { project: ProjectDetail }) {
  const { t } = useLocale()
  const hooks = project.nodes.filter((n) => n.kind === 'webhook' || n.kind === 'schedule')
  return (
    <SettingsBlock
      title={t('projects.settings.webhooks.title')}
      description={t('projects.settings.webhooks.desc')}
    >
      {hooks.length === 0 ? (
        <Text fontSize="sm" color="fg.muted">
          {t('projects.settings.webhooks.empty')}
        </Text>
      ) : (
        <VStack align="stretch" gap={2}>
          {hooks.map((node) => (
            <Box
              key={node.id}
              px={3}
              py={2}
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="var(--radius-input)"
            >
              <Text fontWeight="medium" fontSize="sm">
                {node.label}
              </Text>
              <Text fontSize="xs" color="fg.muted" fontFamily="mono">
                {node.subtitle ?? 'webhook'}
              </Text>
            </Box>
          ))}
        </VStack>
      )}
    </SettingsBlock>
  )
}

export function ProjectSettingsMembersSection() {
  const { t } = useLocale()
  const members = sampleMembers()
  return (
    <SettingsBlock
      title={t('projects.settings.members.title')}
      description={t('projects.settings.members.desc')}
    >
      <VStack align="stretch" gap={2}>
        {members.map((m) => (
          <HStack
            key={m.id}
            justify="space-between"
            px={3}
            py={2}
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="var(--radius-input)"
          >
            <Text fontSize="sm" fontWeight="medium">
              {m.name}
            </Text>
            <Badge size="sm" variant="subtle">
              {m.role}
            </Badge>
          </HStack>
        ))}
      </VStack>
    </SettingsBlock>
  )
}

export function ProjectSettingsTokensSection() {
  const { t } = useLocale()
  const tokens = sampleTokens()
  return (
    <SettingsBlock
      title={t('projects.settings.tokens.title')}
      description={t('projects.settings.tokens.desc')}
    >
      <Table.Root size="sm" variant="line">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>{t('projects.settings.tokens.colLabel')}</Table.ColumnHeader>
            <Table.ColumnHeader>{t('projects.settings.tokens.colToken')}</Table.ColumnHeader>
            <Table.ColumnHeader>{t('projects.settings.tokens.colCreated')}</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {tokens.map((row) => (
            <Table.Row key={row.id}>
              <Table.Cell fontSize="sm">{row.label}</Table.Cell>
              <Table.Cell fontFamily="mono" fontSize="xs" color="fg.muted">
                {row.prefix}
              </Table.Cell>
              <Table.Cell fontSize="xs" color="fg.muted">
                {row.createdAt}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </SettingsBlock>
  )
}

export function ProjectSettingsIntegrationsSection() {
  const { t } = useLocale()
  const channels = [
    { id: 'telegram', labelKey: 'projects.settings.integrations.telegram' },
    { id: 'discord', labelKey: 'projects.settings.integrations.discord' },
  ]
  return (
    <SettingsBlock
      title={t('projects.settings.integrations.title')}
      description={t('projects.settings.integrations.desc')}
    >
      <VStack align="stretch" gap={2}>
        {channels.map((ch) => (
          <HStack
            key={ch.id}
            justify="space-between"
            px={3}
            py={2}
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="var(--radius-input)"
          >
            <Text fontSize="sm">{t(ch.labelKey)}</Text>
            <Badge size="sm" variant="outline" colorPalette="gray">
              {t('projects.settings.integrations.notLinked')}
            </Badge>
          </HStack>
        ))}
      </VStack>
    </SettingsBlock>
  )
}

export function ProjectSettingsDangerSection({
  projectId,
  projectName,
  onDelete,
  deleting,
}: {
  projectId: string
  projectName: string
  onDelete: () => void
  deleting?: boolean
}) {
  const { t } = useLocale()
  return (
    <Box
      className="project-settings-danger"
      p={4}
      borderWidth="1px"
      borderColor="red.muted"
      borderRadius="var(--radius-card)"
      bg="red.subtle"
    >
      <Text fontWeight="semibold" color="red.200">
        {t('projects.settings.danger.title')}
      </Text>
      <Text fontSize="sm" color="fg.muted" mt={1} mb={1}>
        {t('projects.settings.danger.desc', { name: projectName })}
      </Text>
      <Text fontSize="xs" color="fg.subtle" fontFamily="mono" mb={4}>
        {projectId}
      </Text>
      <Button size="sm" colorPalette="red" variant="outline" loading={deleting} onClick={onDelete}>
        {t('projects.settings.danger.delete')}
      </Button>
    </Box>
  )
}
