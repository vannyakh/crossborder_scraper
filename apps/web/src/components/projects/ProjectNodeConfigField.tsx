import {
  Box,
  Button,
  Field,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  Switch,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { ExternalLink } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useLlmModelsQuery } from '../../hooks/queries/use-ai-query'
import type { LlmProviderId } from '../../lib/api/types'
import { useLocale } from '../../hooks/use-locale'
import { syncNodeFromPluginOptions } from '../../lib/plugin-profiles/node-options'
import { useProjectWorkspace } from '../layout/project-shell/project-workspace-context'
import {
  isFieldEditable,
  patchNodeFromField,
  publicUrlForNode,
  readFieldValue,
  readToggleValue,
  resolveFieldValue,
  type ProjectConfigField,
} from './node-config/registry'
import type { ProjectNode } from './project-sample-data'

type ProjectNodeConfigFieldProps = {
  node: ProjectNode
  field: ProjectConfigField
}

export function ProjectNodeConfigField({ node, field }: ProjectNodeConfigFieldProps) {
  const { t } = useLocale()
  const { setProject } = useProjectWorkspace()
  const label = field.labelText ?? t(field.labelKey)
  const editable = isFieldEditable(field)

  const persist = useCallback(
    (value: string | boolean) => {
      setProject((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => {
          if (n.id !== node.id) return n
          const patched = patchNodeFromField(n, field, value)
          return syncNodeFromPluginOptions(patched)
        }),
      }))
    },
    [field, node.id, setProject],
  )

  if (field.type === 'hint') {
    const value = resolveFieldValue(node, field, t)
    return (
      <Box className="project-config-field project-config-field--hint">
        <Text fontSize="xs" color="fg.muted" lineHeight="tall">
          {value === '—' ? t('projects.config.previewHint') : value}
        </Text>
      </Box>
    )
  }

  if (field.type === 'toggle' && editable) {
    return <ToggleField node={node} field={field} label={label} onPersist={persist} />
  }

  if (
    (field.type === 'select' ||
      field.type === 'llm_provider' ||
      field.type === 'source_plugin' ||
      field.type === 'variable_key') &&
    editable &&
    field.options?.length
  ) {
    return <SelectField node={node} field={field} label={label} onPersist={persist} t={t} />
  }

  if (field.type === 'llm_model' && editable) {
    return <LlmModelField node={node} field={field} label={label} onPersist={persist} t={t} />
  }

  if (
    (field.type === 'textarea' ||
      field.type === 'text' ||
      field.type === 'mono' ||
      field.type === 'url' ||
      field.type === 'variable_key') &&
    editable
  ) {
    return (
      <TextField
        node={node}
        field={field}
        label={label}
        multiline={field.type === 'textarea'}
        mono={field.type === 'mono'}
        onPersist={persist}
        t={t}
      />
    )
  }

  if (field.type === 'image') {
    const value = resolveFieldValue(node, field, t)
    return (
      <Box className="project-config-field project-config-field--image">
        <Field.Label className="project-config-field__label">{label}</Field.Label>
        <HStack className="project-config-field__image-row" justify="space-between" gap={2}>
          <Text fontFamily="mono" fontSize="sm">
            {value}
          </Text>
          <Button size="xs" variant="outline" disabled>
            {t('projects.config.upgrade')}
          </Button>
        </HStack>
        <Text className="project-config-field__meta" fontSize="xs" color="fg.muted" mt={2}>
          {t('projects.config.registryHint')}
        </Text>
      </Box>
    )
  }

  if (field.type === 'url') {
    const url = publicUrlForNode(node)
    if (editable) {
      return (
        <TextField
          node={node}
          field={field}
          label={label}
          multiline={false}
          mono
          onPersist={persist}
          t={t}
        />
      )
    }
    return (
      <Box className="project-config-field project-config-field--url">
        <Field.Label className="project-config-field__label">{label}</Field.Label>
        <HStack className="project-config-field__url-box">
          <Text fontFamily="mono" fontSize="xs" lineClamp={2} flex={1}>
            {url}
          </Text>
          <IconButton size="xs" variant="ghost" aria-label={t('projects.config.openUrl')}>
            <ExternalLink size={14} />
          </IconButton>
        </HStack>
      </Box>
    )
  }

  const value = resolveFieldValue(node, field, t)
  return (
    <Box className="project-config-field project-config-field--readonly">
      <HStack justify="space-between" align="flex-start" gap={4}>
        <Text className="project-config-field__label project-config-field__label--inline">
          {label}
        </Text>
        <Text
          className="project-config-field__value"
          fontFamily="mono"
          fontSize="xs"
          textAlign="right"
        >
          {value}
        </Text>
      </HStack>
    </Box>
  )
}

function TextField({
  node,
  field,
  label,
  multiline,
  mono,
  onPersist,
  t,
}: {
  node: ProjectNode
  field: ProjectConfigField
  label: string
  multiline: boolean
  mono?: boolean
  onPersist: (value: string) => void
  t: (key: string) => string
}) {
  const initial = String(readFieldValue(node, field) ?? '')
  const [draft, setDraft] = useState(initial)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() =>
      setDraft(String(readFieldValue(node, field) ?? '')),
    )
    return () => window.cancelAnimationFrame(frame)
  }, [node, field])

  const sharedProps = {
    className: 'project-config-field__control',
    value: draft,
    placeholder:
      field.placeholderText ?? (field.placeholderKey ? t(field.placeholderKey) : undefined),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(event.target.value),
    onBlur: () => onPersist(draft.trim()),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDraft(String(readFieldValue(node, field) ?? ''))
        ;(event.target as HTMLElement).blur()
      }
    },
  }

  return (
    <Field.Root className="project-config-field project-config-field--edit">
      <Field.Label className="project-config-field__label">{label}</Field.Label>
      {multiline ? (
        <Textarea {...sharedProps} rows={field.rows ?? 4} resize="vertical" />
      ) : (
        <Input {...sharedProps} size="sm" fontFamily={mono ? 'mono' : undefined} />
      )}
      {field.hintText || field.hintKey ? (
        <Field.HelperText className="project-config-field__hint">
          {field.hintText ?? (field.hintKey ? t(field.hintKey) : '')}
        </Field.HelperText>
      ) : null}
    </Field.Root>
  )
}

function SelectField({
  node,
  field,
  label,
  onPersist,
  t,
}: {
  node: ProjectNode
  field: ProjectConfigField
  label: string
  onPersist: (value: string) => void
  t: (key: string) => string
}) {
  const current = String(readFieldValue(node, field) ?? field.options?.[0]?.value ?? '')

  return (
    <Field.Root className="project-config-field project-config-field--edit">
      <Field.Label className="project-config-field__label">{label}</Field.Label>
      <NativeSelect.Root size="sm" className="project-config-field__control">
        <NativeSelect.Field value={current} onChange={(event) => onPersist(event.target.value)}>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label ?? t(opt.labelKey)}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Field.Root>
  )
}

function LlmModelField({
  node,
  field,
  label,
  onPersist,
  t,
}: {
  node: ProjectNode
  field: ProjectConfigField
  label: string
  onPersist: (value: string) => void
  t: (key: string) => string
}) {
  const provider = String(node.options?.llm_provider ?? 'openai') as LlmProviderId
  const { data, isLoading } = useLlmModelsQuery({ ai_provider: provider }, true)
  const models = data?.models ?? []
  const current = String(readFieldValue(node, field) ?? models[0]?.id ?? '')

  return (
    <Field.Root className="project-config-field project-config-field--edit">
      <Field.Label className="project-config-field__label">{label}</Field.Label>
      <NativeSelect.Root
        size="sm"
        className="project-config-field__control"
        disabled={isLoading && models.length === 0}
      >
        <NativeSelect.Field value={current} onChange={(event) => onPersist(event.target.value)}>
          {models.length === 0 ? (
            <option value={current}>{current || t('projects.config.modelLoading')}</option>
          ) : (
            models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label || model.id}
              </option>
            ))
          )}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      {field.hintText || field.hintKey ? (
        <Field.HelperText className="project-config-field__hint">
          {field.hintText ?? (field.hintKey ? t(field.hintKey) : '')}
        </Field.HelperText>
      ) : null}
    </Field.Root>
  )
}

function ToggleField({
  node,
  field,
  label,
  onPersist,
}: {
  node: ProjectNode
  field: ProjectConfigField
  label: string
  onPersist: (value: boolean) => void
}) {
  const checked = readToggleValue(node, field)

  return (
    <HStack className="project-config-field project-config-field--toggle" justify="space-between">
      <Text className="project-config-field__label project-config-field__label--inline">
        {label}
      </Text>
      <Switch.Root checked={checked} onCheckedChange={(details) => onPersist(details.checked)}>
        <Switch.HiddenInput />
        <Switch.Control />
      </Switch.Root>
    </HStack>
  )
}
