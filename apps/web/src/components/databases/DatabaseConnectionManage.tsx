import { Box, Button, Field, Grid, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { KeyRound, RefreshCw, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  useStoreCredentialsQuery,
  useStoreRefreshMutation,
  useStoreUpdateConfigMutation,
} from '../../hooks/queries/use-store-query'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreCatalogItem, StoreInstalled, StoreUpdateConfigRequest } from '../../lib/api'
import { SectionCard } from '../ui/Section'
import { fieldStyles } from '../ui/field-styles'
import { CopyableSecretField } from './CopyableSecretField'

type ConnectionForm = {
  host: string
  port: string
  username: string
  database: string
  password: string
}

function formFromInstallation(installation: StoreInstalled): ConnectionForm {
  const config = installation.config ?? {}
  return {
    host: String(config.host ?? '127.0.0.1'),
    port: config.port != null ? String(config.port) : '',
    username: String(config.username ?? ''),
    database: String(config.database ?? ''),
    password: '',
  }
}

export function DatabaseConnectionManage({
  pluginId,
  catalogItem,
  installation,
}: {
  pluginId: string
  catalogItem: StoreCatalogItem
  installation: StoreInstalled
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const updateMutation = useStoreUpdateConfigMutation()
  const refreshMutation = useStoreRefreshMutation()
  const [fetchCreds, setFetchCreds] = useState(false)
  const credentials = useStoreCredentialsQuery(pluginId, fetchCreds)
  const [form, setForm] = useState(() => formFromInstallation(installation))
  const [passwordDirty, setPasswordDirty] = useState(false)

  const mode = installation.mode ?? '—'
  const isManaged = mode === 'docker' || mode === 'native'
  const fields = catalogItem.connection_fields

  useEffect(() => {
    setForm(formFromInstallation(installation))
    setPasswordDirty(false)
  }, [installation])

  useEffect(() => {
    if (credentials.data?.password && !passwordDirty) {
      setForm((prev) => ({ ...prev, password: credentials.data?.password ?? '' }))
    }
  }, [credentials.data?.password, passwordDirty])

  function patchBody(): StoreUpdateConfigRequest {
    const body: StoreUpdateConfigRequest = {
      host: form.host.trim() || '127.0.0.1',
      port: Number(form.port) || catalogItem.default_port,
    }
    const username = form.username.trim()
    const database = form.database.trim()
    if (username) body.username = username
    if (database) body.database = database
    if (passwordDirty && form.password) body.password = form.password
    return body
  }

  async function handleSave() {
    await updateMutation.mutateAsync({ pluginId, body: patchBody() })
    setPasswordDirty(false)
    setFetchCreds(true)
    await credentials.refetch()
  }

  async function handleRegeneratePassword() {
    await updateMutation.mutateAsync({ pluginId, body: { regenerate_password: true } })
    setFetchCreds(true)
    const next = await credentials.refetch()
    if (next.data?.password) {
      setForm((prev) => ({ ...prev, password: next.data.password ?? '' }))
      setPasswordDirty(false)
    }
  }

  async function handleTest() {
    await refreshMutation.mutateAsync(pluginId)
  }

  return (
    <VStack align="stretch" gap={4}>
      <SectionCard>
        <Text fontSize="sm" fontWeight="medium" mb={3}>
          {t('db.manage.connectionTitle')}
        </Text>
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3}>
          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted">
              {t('db.manage.host')}
            </Field.Label>
            <Input
              size="sm"
              {...fieldStyles}
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted">
              {t('db.manage.port')}
            </Field.Label>
            <Input
              size="sm"
              type="number"
              {...fieldStyles}
              value={form.port}
              onChange={(e) => setForm({ ...form, port: e.target.value })}
            />
          </Field.Root>
          {fields.some((f) => f.key === 'username') ? (
            <Field.Root>
              <Field.Label fontSize="xs" color="fg.muted">
                {t('db.manage.username')}
              </Field.Label>
              <Input
                size="sm"
                {...fieldStyles}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </Field.Root>
          ) : null}
          {fields.some((f) => f.key === 'database') ? (
            <Field.Root>
              <Field.Label fontSize="xs" color="fg.muted">
                {t('db.manage.database')}
              </Field.Label>
              <Input
                size="sm"
                {...fieldStyles}
                value={form.database}
                onChange={(e) => setForm({ ...form, database: e.target.value })}
              />
            </Field.Root>
          ) : null}
        </Grid>

        {fields.some((f) => f.key === 'password') ? (
          <Box mt={3}>
            <Field.Root>
              <Field.Label fontSize="xs" color="fg.muted">
                {t('db.manage.password')}
              </Field.Label>
              <Input
                size="sm"
                type="password"
                {...fieldStyles}
                value={form.password}
                placeholder={
                  installation.config?.password_set
                    ? t('db.manage.passwordPlaceholderSet')
                    : t('db.manage.passwordPlaceholder')
                }
                onChange={(e) => {
                  setPasswordDirty(true)
                  setForm({ ...form, password: e.target.value })
                }}
              />
            </Field.Root>
            <Box mt={2}>
              <CopyableSecretField
                label={t('db.manage.copyPassword')}
                value={form.password}
                loading={credentials.isFetching}
                onReveal={() => {
                  setFetchCreds(true)
                  void credentials.refetch()
                }}
              />
            </Box>
          </Box>
        ) : null}

        <Text mt={3} fontSize="xs" color="fg.muted" lineHeight="tall">
          {isManaged ? t('db.manage.managedHint') : t('db.manage.externalHint')}
        </Text>
      </SectionCard>

      <HStack gap={2} flexWrap="wrap">
        <Button
          size="sm"
          colorPalette={accentPalette}
          borderRadius="input"
          loading={updateMutation.isPending}
          onClick={() => void handleSave()}
        >
          <Save size={14} />
          {t('db.manage.save')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="input"
          loading={updateMutation.isPending}
          onClick={() => void handleTest()}
        >
          <RefreshCw size={14} />
          {t('db.manage.testConnection')}
        </Button>
        {isManaged && fields.some((f) => f.key === 'password') ? (
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            loading={updateMutation.isPending}
            onClick={() => void handleRegeneratePassword()}
          >
            <KeyRound size={14} />
            {t('db.manage.regeneratePassword')}
          </Button>
        ) : null}
      </HStack>

      <SectionCard>
        <Text fontSize="xs" color="fg.muted">
          {t('db.manage.modeLabel')}: <strong>{mode}</strong>
          {installation.container_name ? (
            <>
              {' '}
              · {t('db.manage.container')}: {String(installation.container_name)}
            </>
          ) : null}
        </Text>
      </SectionCard>
    </VStack>
  )
}
