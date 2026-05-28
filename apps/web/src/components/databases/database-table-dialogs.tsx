import { Box, Button, Checkbox, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  useAddTableColumnMutation,
  useCreateDatabaseTableMutation,
  useInsertTableRowMutation,
} from '../../hooks/queries/use-database-engine-query'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { DatabaseColumnInfo } from '../../lib/api'
import { notifyError, notifySuccess } from '../../lib/toast'
import { PanelDialog } from '../ui/PanelDialog'
import { fieldStyles } from '../ui/field-styles'
import {
  defaultCreateColumns,
  errorMessageFromUnknown,
  validateCreateTablePayload,
  validateIdent,
  type ColumnDraft,
} from './database-form-utils'

function defaultColumnType(pluginId: string): string {
  return pluginId === 'postgresql' ? 'TEXT' : 'VARCHAR(255)'
}

export function CreateTableDialog({
  open,
  onClose,
  pluginId,
  databaseName,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  pluginId: string
  databaseName: string
  onCreated: () => void
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const mutation = useCreateDatabaseTableMutation()
  const [tableName, setTableName] = useState('')
  const [columns, setColumns] = useState<ColumnDraft[]>(() => defaultCreateColumns(pluginId))
  const [formError, setFormError] = useState<string | null>(null)

  const submit = async () => {
    const validation = validateCreateTablePayload(pluginId, tableName, columns)
    if (validation) {
      setFormError(validation)
      return
    }
    setFormError(null)
    const payloadColumns = columns
      .filter((c) => c.name.trim())
      .map((c) => ({
        name: c.name.trim(),
        type: c.type.trim(),
        nullable: c.nullable,
        primary: c.primary,
        auto_increment: c.auto_increment,
      }))
    try {
      const result = await mutation.mutateAsync({
        pluginId,
        databaseName,
        body: { table_name: tableName.trim(), columns: payloadColumns },
      })
      notifySuccess(result.message ?? t('db.tools.createTableDone'))
      onCreated()
      onClose()
      setTableName('')
      setColumns(defaultCreateColumns(pluginId))
    } catch (err) {
      const message = errorMessageFromUnknown(err)
      setFormError(message)
      notifyError(message)
    }
  }

  return (
    <PanelDialog
      open={open}
      onClose={onClose}
      title={t('db.tools.newTable')}
      maxW="lg"
      footer={
        <HStack justify="flex-end" gap={2}>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {t('db.create.cancel')}
          </Button>
          <Button
            size="sm"
            colorPalette={accentPalette}
            loading={mutation.isPending}
            disabled={!tableName.trim()}
            onClick={() => void submit()}
          >
            {t('db.tools.createTable')}
          </Button>
        </HStack>
      }
    >
      <VStack align="stretch" gap={3}>
        {formError ? (
          <Text fontSize="xs" color="red.400">
            {formError}
          </Text>
        ) : null}
        <Box>
          <Text fontSize="xs" color="fg.muted" mb={1}>
            {t('db.tools.tableName')}
          </Text>
          <Input
            {...fieldStyles}
            size="sm"
            fontFamily="mono"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
          />
        </Box>
        <Text fontSize="xs" fontWeight="semibold">
          {t('db.tools.columns')}
        </Text>
        {columns.map((col, idx) => (
          <HStack key={idx} align="flex-start" gap={2} flexWrap="wrap">
            <Input
              {...fieldStyles}
              size="sm"
              w="120px"
              fontFamily="mono"
              placeholder={t('db.tools.colName')}
              value={col.name}
              onChange={(e) => {
                const next = [...columns]
                next[idx] = { ...col, name: e.target.value }
                setColumns(next)
              }}
            />
            <Input
              {...fieldStyles}
              size="sm"
              flex={1}
              minW="140px"
              fontFamily="mono"
              placeholder={t('db.tools.colDataType')}
              value={col.type}
              onChange={(e) => {
                const next = [...columns]
                next[idx] = { ...col, type: e.target.value }
                setColumns(next)
              }}
            />
            <Checkbox.Root
              size="sm"
              checked={col.primary}
              onCheckedChange={(d) => {
                const next = [...columns]
                next[idx] = { ...col, primary: Boolean(d.checked) }
                setColumns(next)
              }}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label fontSize="xs">PK</Checkbox.Label>
            </Checkbox.Root>
            {pluginId !== 'postgresql' ? (
              <Checkbox.Root
                size="sm"
                checked={col.auto_increment}
                onCheckedChange={(d) => {
                  const next = [...columns]
                  next[idx] = { ...col, auto_increment: Boolean(d.checked) }
                  setColumns(next)
                }}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label fontSize="xs">AI</Checkbox.Label>
              </Checkbox.Root>
            ) : null}
            <IconButtonRemove
              disabled={columns.length <= 1}
              onClick={() => setColumns(columns.filter((_, i) => i !== idx))}
            />
          </HStack>
        ))}
        <Button
          size="xs"
          variant="outline"
          alignSelf="flex-start"
          onClick={() =>
            setColumns([
              ...columns,
              {
                name: '',
                type: defaultColumnType(pluginId),
                nullable: true,
                primary: false,
                auto_increment: false,
              },
            ])
          }
        >
          <Plus size={12} />
          {t('db.tools.addColumnRow')}
        </Button>
      </VStack>
    </PanelDialog>
  )
}

function IconButtonRemove({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <Button
      size="xs"
      variant="ghost"
      disabled={disabled}
      onClick={onClick}
      aria-label="Remove column"
    >
      <Trash2 size={14} />
    </Button>
  )
}

export function AddColumnDialog({
  open,
  onClose,
  pluginId,
  databaseName,
  tableName,
  onDone,
}: {
  open: boolean
  onClose: () => void
  pluginId: string
  databaseName: string
  tableName: string
  onDone: () => void
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const mutation = useAddTableColumnMutation()
  const [columnName, setColumnName] = useState('')
  const [columnType, setColumnType] = useState(defaultColumnType(pluginId))
  const [nullable, setNullable] = useState(true)
  const [defaultVal, setDefaultVal] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const submit = async () => {
    const nameErr = validateIdent(columnName, 'Column name')
    if (nameErr) {
      setFormError(nameErr)
      return
    }
    if (!columnType.trim()) {
      setFormError(t('db.tools.colTypeRequired'))
      return
    }
    setFormError(null)
    try {
      const result = await mutation.mutateAsync({
        pluginId,
        databaseName,
        tableName,
        body: {
          column_name: columnName.trim(),
          column_type: columnType.trim(),
          nullable,
          default: defaultVal.trim() || null,
        },
      })
      notifySuccess(result.message ?? t('db.tools.addColumnDone'))
      onDone()
      onClose()
    } catch (err) {
      const message = errorMessageFromUnknown(err)
      setFormError(message)
      notifyError(message)
    }
  }

  return (
    <PanelDialog
      open={open}
      onClose={onClose}
      title={t('db.tools.addColumn')}
      footer={
        <HStack justify="flex-end" gap={2}>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {t('db.create.cancel')}
          </Button>
          <Button
            size="sm"
            colorPalette={accentPalette}
            loading={mutation.isPending}
            disabled={!columnName.trim()}
            onClick={() => void submit()}
          >
            {t('db.tools.addColumn')}
          </Button>
        </HStack>
      }
    >
      <VStack align="stretch" gap={3}>
        {formError ? (
          <Text fontSize="xs" color="red.400">
            {formError}
          </Text>
        ) : null}
        <Field label={t('db.tools.colName')} value={columnName} onChange={setColumnName} />
        <Field label={t('db.tools.colDataType')} value={columnType} onChange={setColumnType} />
        <Checkbox.Root checked={nullable} onCheckedChange={(d) => setNullable(Boolean(d.checked))}>
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label fontSize="sm">{t('db.tools.nullable')}</Checkbox.Label>
        </Checkbox.Root>
        <Field label={t('db.tools.defaultValue')} value={defaultVal} onChange={setDefaultVal} />
      </VStack>
    </PanelDialog>
  )
}

export function InsertRowDialog({
  open,
  onClose,
  pluginId,
  databaseName,
  tableName,
  columns,
  onDone,
}: {
  open: boolean
  onClose: () => void
  pluginId: string
  databaseName: string
  tableName: string
  columns: DatabaseColumnInfo[]
  onDone: () => void
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const mutation = useInsertTableRowMutation()
  const [values, setValues] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const submit = async () => {
    const payload: Record<string, string | null> = {}
    for (const col of columns) {
      if (!(col.name in values)) continue
      const raw = values[col.name]
      payload[col.name] = raw === '' ? null : raw
    }
    if (!Object.keys(payload).length) {
      const msg = t('db.tools.insertNeedValues')
      setFormError(msg)
      notifyError(msg)
      return
    }
    setFormError(null)
    try {
      const result = await mutation.mutateAsync({
        pluginId,
        databaseName,
        tableName,
        body: { values: payload },
      })
      notifySuccess(result.message ?? t('db.tools.insertRowDone'))
      onDone()
      onClose()
      setValues({})
    } catch (err) {
      const message = errorMessageFromUnknown(err)
      setFormError(message)
      notifyError(message)
    }
  }

  return (
    <PanelDialog
      open={open}
      onClose={onClose}
      title={t('db.tools.insertRow')}
      maxW="md"
      footer={
        <HStack justify="flex-end" gap={2}>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {t('db.create.cancel')}
          </Button>
          <Button
            size="sm"
            colorPalette={accentPalette}
            loading={mutation.isPending}
            onClick={() => void submit()}
          >
            {t('db.tools.insertRow')}
          </Button>
        </HStack>
      }
    >
      <VStack align="stretch" gap={2}>
        {formError ? (
          <Text fontSize="xs" color="red.400">
            {formError}
          </Text>
        ) : null}
        {columns.length ? (
          columns.map((col) => (
            <Box key={col.name}>
              <Text fontSize="xs" color="fg.muted" mb={1} fontFamily="mono">
                {col.name}{' '}
                <Text as="span" color="fg.subtle">
                  ({col.data_type})
                </Text>
              </Text>
              <Input
                {...fieldStyles}
                size="sm"
                fontFamily="mono"
                value={values[col.name] ?? ''}
                placeholder={col.nullable ? 'NULL' : t('db.tools.required')}
                onChange={(e) => setValues({ ...values, [col.name]: e.target.value })}
              />
            </Box>
          ))
        ) : (
          <Text fontSize="sm" color="fg.muted">
            {t('db.tools.noColumns')}
          </Text>
        )}
      </VStack>
    </PanelDialog>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Box>
      <Text fontSize="xs" color="fg.muted" mb={1}>
        {label}
      </Text>
      <Input
        {...fieldStyles}
        size="sm"
        fontFamily="mono"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Box>
  )
}
