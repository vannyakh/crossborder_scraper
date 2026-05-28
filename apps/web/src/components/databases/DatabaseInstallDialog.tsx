import { Box, Button, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { useDatabaseInstallOptionsQuery } from '../../hooks/queries/use-database-engine-query'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreInstallOptions } from '../store/StoreInstallDialog'
import { pluginIcon } from '../store/store-utils'
import { PanelDialog } from '../ui/PanelDialog'
import { PanelSelect } from '../ui/PanelSelect'

export function DatabaseInstallDialog({
  pluginId,
  open,
  installing,
  onClose,
  onConfirm,
}: {
  pluginId: string | null
  open: boolean
  installing: boolean
  onClose: () => void
  onConfirm: (options: StoreInstallOptions) => void
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const optionsQuery = useDatabaseInstallOptionsQuery(pluginId, open)
  const opts = optionsQuery.data
  const Icon = pluginIcon(pluginId ?? '')

  const defaultMode = useMemo((): 'native' | 'docker' => {
    if (opts?.native_available) return 'native'
    if (opts?.docker_available) return 'docker'
    return 'docker'
  }, [opts?.native_available, opts?.docker_available])

  const [mode, setMode] = useState<'native' | 'docker'>(defaultMode)
  const [version, setVersion] = useState('')
  const [port, setPort] = useState('')

  const versionList = mode === 'native' ? opts?.native_versions : opts?.docker_versions
  const versionOptions = useMemo(
    () =>
      (versionList ?? []).map((row) => ({
        value: row.id,
        label: row.recommended ? `${row.label} (${t('db.install.recommended')})` : row.label,
      })),
    [versionList, t],
  )

  useEffect(() => {
    if (!open || !opts) return
    setMode(defaultMode)
    setVersion(opts.default_version)
    setPort(String(opts.default_port))
  }, [open, opts, defaultMode])

  useEffect(() => {
    if (!versionList?.length) return
    if (!versionList.some((row) => row.id === version)) {
      const preferred = versionList.find((row) => row.recommended)?.id ?? versionList[0]?.id ?? ''
      setVersion(preferred)
    }
  }, [versionList, version])

  const selectedDockerImage = versionList?.find((row) => row.id === version)?.docker_image
  const canInstall =
    mode === 'native' ? Boolean(opts?.native_available) : Boolean(opts?.docker_available)

  if (!pluginId) return null

  const title = (
    <HStack gap={2}>
      <Box color="fg.muted">
        <Icon size={20} />
      </Box>
      <span>{t('db.install.title', { product: opts?.product ?? pluginId })}</span>
    </HStack>
  )

  const footer = (
    <HStack gap={2} w="full" justify="flex-end">
      <Button size="sm" variant="outline" borderColor="border.subtle" onClick={onClose}>
        {t('db.create.cancel')}
      </Button>
      <Button
        size="sm"
        colorPalette={accentPalette}
        loading={installing}
        disabled={!canInstall || !version || !port || !versionOptions.length}
        onClick={() =>
          onConfirm({
            pluginId,
            mode,
            version,
            port: Number(port),
          })
        }
      >
        {t('db.install.quickInstall')}
      </Button>
    </HStack>
  )

  return (
    <PanelDialog open={open} onClose={onClose} title={title} footer={footer}>
      {optionsQuery.isLoading ? (
        <Text fontSize="sm" color="fg.muted">
          {t('db.install.loadingVersions')}
        </Text>
      ) : optionsQuery.isError || !opts ? (
        <Text fontSize="sm" color="fg.muted">
          {t('db.install.optionsUnavailable')}
        </Text>
      ) : (
        <VStack align="stretch" gap={4}>
          <Text fontSize="sm" color="fg.muted" lineHeight="tall">
            {opts.description}
          </Text>
          {opts.host_detected_version ? (
            <Text fontSize="xs" color="fg.subtle">
              {t('db.install.hostDetected', { version: opts.host_detected_version })}
            </Text>
          ) : null}

          <VStack align="stretch" gap={1.5}>
            <Text fontSize="sm" fontWeight="medium">
              {t('db.install.method')}
            </Text>
            <PanelSelect
              value={mode}
              disabled={!open}
              zIndex={1600}
              options={[
                ...(opts.supports_native
                  ? [
                      {
                        value: 'native',
                        label: opts.native_available
                          ? t('db.install.methodNative')
                          : t('db.install.methodNativeUnavailable'),
                      },
                    ]
                  : []),
                ...(opts.supports_docker
                  ? [
                      {
                        value: 'docker',
                        label: opts.docker_available
                          ? t('db.install.methodDocker')
                          : t('db.install.methodDockerUnavailable'),
                      },
                    ]
                  : []),
              ]}
              onChange={(next) => setMode(next as 'native' | 'docker')}
            />
          </VStack>

          <VStack align="stretch" gap={1.5}>
            <Text fontSize="sm" fontWeight="medium">
              {t('db.install.version')}
            </Text>
            {versionOptions.length ? (
              <PanelSelect
                value={version}
                disabled={!open}
                zIndex={1600}
                options={versionOptions}
                onChange={setVersion}
              />
            ) : (
              <Text fontSize="xs" color="fg.subtle">
                {t('db.install.noVersionsOnPlatform')}
              </Text>
            )}
          </VStack>

          <VStack align="stretch" gap={1.5}>
            <Text fontSize="sm" fontWeight="medium">
              {t('db.install.port')}
            </Text>
            <Input
              size="sm"
              type="number"
              value={port}
              borderRadius="var(--radius-input)"
              borderColor="border.subtle"
              onChange={(e) => setPort(e.target.value)}
            />
          </VStack>

          {mode === 'docker' && selectedDockerImage ? (
            <Text fontSize="xs" color="fg.subtle" fontFamily="mono">
              {t('db.install.dockerImage')}: {selectedDockerImage}
            </Text>
          ) : null}
          {mode === 'native' ? (
            <Text fontSize="xs" color="fg.subtle">
              {t('db.install.nativeHint', { platform: opts.platform })}
            </Text>
          ) : null}
          <Text fontSize="xs" color="fg.subtle" lineHeight="tall">
            {t('db.install.officialPackagesHint')}
          </Text>
        </VStack>
      )}
    </PanelDialog>
  )
}
