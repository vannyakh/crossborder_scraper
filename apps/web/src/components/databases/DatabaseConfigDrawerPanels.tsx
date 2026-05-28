import { Button, Field, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { Trash2, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  useOptimizeDatabaseMutation,
  usePatchLogicalDatabaseMutation,
} from '../../hooks/queries/use-database-engine-query'
import { useStoreDropDatabaseMutation } from '../../hooks/queries/use-store-query'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreDatabaseConnectionView, StoreDatabaseEntry } from '../../lib/api'
import { DatabaseToolsPanel } from './DatabaseToolsPanel'
import { notifyError, notifySuccess } from '../../lib/toast'
import { PanelSelect } from '../ui/PanelSelect'
import { SectionCard } from '../ui/Section'
import { fieldStyles } from '../ui/field-styles'
import { DB_ACCESS_OPTIONS } from './database-access'
import type { DatabaseConfigSectionId } from './database-config-sections'

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <HStack
      justify="space-between"
      py={2}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      fontSize="sm"
      gap={4}
    >
      <Text color="fg.muted" flexShrink={0}>
        {label}
      </Text>
      <Text
        fontWeight="medium"
        fontFamily={mono ? 'mono' : undefined}
        fontSize="xs"
        textAlign="right"
        lineClamp={2}
      >
        {value}
      </Text>
    </HStack>
  )
}

export function DatabaseConfigSectionBody({
  section,
  pluginId,
  row,
  connection,
  supportsOptimize,
  supportsPermission,
  supportsInspect,
  canDrop,
  onClose,
  onUpdated,
}: {
  section: DatabaseConfigSectionId
  pluginId: string
  row: StoreDatabaseEntry
  connection?: StoreDatabaseConnectionView
  supportsOptimize: boolean
  supportsPermission: boolean
  supportsInspect: boolean
  canDrop: boolean
  onClose: () => void
  onUpdated?: () => void
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const optimizeMutation = useOptimizeDatabaseMutation()
  const patchMutation = usePatchLogicalDatabaseMutation()
  const dropMutation = useStoreDropDatabaseMutation()

  const [access, setAccess] = useState<'local' | 'remote'>('local')
  const [password, setPassword] = useState('')
  useEffect(() => {
    setAccess(row.access === 'remote' ? 'remote' : 'local')
    setPassword(row.password)
  }, [row])

  const busy = optimizeMutation.isPending || patchMutation.isPending || dropMutation.isPending

  const accessOptions = DB_ACCESS_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey),
  }))

  const host = connection?.host ?? '127.0.0.1'
  const port = connection?.port != null ? String(connection.port) : '—'
  const endpoint = port !== '—' ? `${host}:${port}` : host

  async function handleOptimize() {
    if (!confirm(t('db.table.optimizeConfirm', { name: row.name }))) return
    try {
      await optimizeMutation.mutateAsync({ pluginId, databaseName: row.name })
      notifySuccess(t('db.table.optimizeDone', { name: row.name }))
      onUpdated?.()
    } catch (err) {
      notifyError(err)
    }
  }

  async function handleDelete() {
    if (!confirm(t('db.danger.dropConfirm', { name: row.name }))) return
    try {
      await dropMutation.mutateAsync({ pluginId, databaseName: row.name })
      notifySuccess(t('db.danger.dropDone', { name: row.name }))
      onClose()
      onUpdated?.()
    } catch (err) {
      notifyError(err)
    }
  }

  switch (section) {
    case 'database':
      return (
        <DatabaseToolsPanel pluginId={pluginId} databaseName={row.name} enabled={supportsInspect} />
      )

    case 'matrix':
      return (
        <SectionCard>
          <Text fontSize="sm" color="fg.muted" mb={2} lineHeight="tall">
            {t('db.config.matrixHint')}
          </Text>
          <InfoRow label={t('db.config.matrix.dbName')} value={row.name} mono />
          <InfoRow label={t('db.manage.username')} value={row.username || '—'} mono />
          <InfoRow label={t('db.config.matrix.endpoint')} value={endpoint} mono />
          <InfoRow label={t('db.config.matrix.host')} value={host} mono />
          <InfoRow label={t('db.manage.port')} value={port} mono />
          <InfoRow
            label={t('db.create.accessLabel')}
            value={
              row.access === 'remote' ? t('db.table.locationRemote') : t('db.table.locationLocal')
            }
          />
          <InfoRow label={t('db.create.charset')} value={row.charset || 'utf8mb4'} mono />
          <InfoRow label={t('db.config.matrix.mode')} value={connection?.mode ?? '—'} />
          {row.created_at ? (
            <InfoRow label={t('db.config.matrix.created')} value={row.created_at.slice(0, 19)} />
          ) : null}
        </SectionCard>
      )

    case 'credential':
      return (
        <VStack align="stretch" gap={4}>
          {supportsPermission ? (
            <SectionCard>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                {t('db.config.accessSection')}
              </Text>
              <Field.Root mb={3}>
                <Field.Label fontSize="sm">{t('db.create.accessLabel')}</Field.Label>
                <PanelSelect
                  value={access}
                  options={accessOptions}
                  onChange={(value) => setAccess(value as 'local' | 'remote')}
                />
              </Field.Root>
              <Button
                size="sm"
                colorPalette={accentPalette}
                borderRadius="input"
                loading={patchMutation.isPending}
                disabled={busy}
                onClick={() =>
                  void patchMutation
                    .mutateAsync({ pluginId, databaseName: row.name, body: { access } })
                    .then(() => {
                      notifySuccess(t('db.table.permissionDone', { name: row.name }))
                      onUpdated?.()
                    })
                    .catch(notifyError)
                }
              >
                {t('db.manage.save')}
              </Button>
            </SectionCard>
          ) : null}
          <SectionCard>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
              {t('db.config.passwordSection')}
            </Text>
            <Field.Root mb={3}>
              <Field.Label fontSize="sm">{t('db.manage.password')}</Field.Label>
              <Input
                {...fieldStyles}
                value={password}
                disabled={busy}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field.Root>
            <HStack gap={2} flexWrap="wrap">
              <Button
                size="sm"
                variant="outline"
                borderColor="border.subtle"
                borderRadius="input"
                loading={patchMutation.isPending}
                disabled={busy}
                onClick={() =>
                  void patchMutation
                    .mutateAsync({
                      pluginId,
                      databaseName: row.name,
                      body: { regenerate_password: true },
                    })
                    .then(() => {
                      notifySuccess(t('db.table.passwordDone', { name: row.name }))
                      onUpdated?.()
                    })
                    .catch(notifyError)
                }
              >
                {t('db.manage.regeneratePassword')}
              </Button>
              <Button
                size="sm"
                colorPalette={accentPalette}
                borderRadius="input"
                loading={patchMutation.isPending}
                disabled={busy}
                onClick={() =>
                  void patchMutation
                    .mutateAsync({
                      pluginId,
                      databaseName: row.name,
                      body: { password: password.trim() },
                    })
                    .then(() => {
                      notifySuccess(t('db.table.passwordDone', { name: row.name }))
                      onUpdated?.()
                    })
                    .catch(notifyError)
                }
              >
                {t('db.manage.save')}
              </Button>
            </HStack>
          </SectionCard>
          <SectionCard>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
              {t('db.config.tableMetaSection')}
            </Text>
            <InfoRow label={t('db.create.charset')} value={row.charset || 'utf8mb4'} mono />
            <InfoRow
              label={t('db.config.tableUtil')}
              value={row.legacy ? t('db.danger.legacy') : t('db.config.utilManaged')}
            />
          </SectionCard>
        </VStack>
      )

    case 'danger':
      return (
        <VStack align="stretch" gap={4}>
          {supportsOptimize ? (
            <SectionCard>
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                {t('db.config.toolsSection')}
              </Text>
              <Text fontSize="xs" color="fg.muted" mb={3} lineHeight="tall">
                {t('db.config.optimizeHint')}
              </Text>
              <Button
                size="sm"
                variant="outline"
                borderColor="border.subtle"
                borderRadius="input"
                loading={optimizeMutation.isPending}
                disabled={busy}
                onClick={() => void handleOptimize()}
              >
                <Wrench size={14} />
                {t('db.table.optimize')}
              </Button>
            </SectionCard>
          ) : null}
          {canDrop ? (
            <SectionCard borderColor="red.200">
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                {t('db.danger.dropTitle')}
              </Text>
              <Text fontSize="xs" color="fg.muted" mb={3} lineHeight="tall">
                {t('db.danger.dropHint')}
              </Text>
              <Button
                size="sm"
                variant="outline"
                colorPalette="red"
                borderRadius="input"
                loading={dropMutation.isPending}
                disabled={busy}
                onClick={() => void handleDelete()}
              >
                <Trash2 size={14} />
                {t('db.table.delete')}
              </Button>
            </SectionCard>
          ) : null}
        </VStack>
      )

    default:
      return null
  }
}
