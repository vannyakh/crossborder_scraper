import { Button, Dialog, HStack, Input, NativeSelect, Text, VStack } from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreCatalogItem, StoreEnvironment } from '../../lib/api'

export type StoreInstallOptions = {
  pluginId: string
  mode: 'native' | 'docker'
  version: string
  port: number
}

export function StoreInstallDialog({
  item,
  env,
  open,
  installing,
  onClose,
  onConfirm,
}: {
  item: StoreCatalogItem | null
  env?: StoreEnvironment
  open: boolean
  installing: boolean
  onClose: () => void
  onConfirm: (options: StoreInstallOptions) => void
}) {
  const accentPalette = useAccentPalette()
  const versions = item?.available_versions?.length
    ? item.available_versions
    : item
      ? [item.default_version || item.version]
      : []

  const nativeReady = Boolean(env?.native_driver_available)
  const dockerReady = Boolean(env?.docker_available && env?.compose_available)

  const defaultMode = useMemo((): 'native' | 'docker' => {
    if (item?.supports_native && nativeReady) return 'native'
    if (item?.supports_docker && dockerReady) return 'docker'
    return 'native'
  }, [item, nativeReady, dockerReady])

  const [mode, setMode] = useState<'native' | 'docker'>(defaultMode)
  const [version, setVersion] = useState('')
  const [port, setPort] = useState('')

  useEffect(() => {
    if (!item) return
    setMode(defaultMode)
    setVersion(item.default_version || item.version || versions[0] || '')
    setPort(String(item.default_port))
  }, [item, defaultMode, versions])

  if (!item) return null

  const canNative = item.supports_native && nativeReady
  const canDocker = item.supports_docker && dockerReady
  const canInstall = mode === 'native' ? canNative : canDocker

  return (
    <Dialog.Root open={open} onOpenChange={(d) => !d.open && onClose()} placement="center">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="md" borderRadius="var(--radius-panel)">
          <Dialog.Header>
            <Dialog.Title>Install {item.name}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <VStack align="stretch" gap={4}>
              <Text fontSize="sm" color="fg.muted">
                Install a host driver with auto-setup scripts, or run inside Docker on this VPS.
              </Text>

              <VStack align="stretch" gap={1.5}>
                <Text fontSize="sm" fontWeight="medium">
                  Install method
                </Text>
                <NativeSelect.Root size="sm">
                  <NativeSelect.Field
                    value={mode}
                    borderRadius="var(--radius-input)"
                    borderColor="border.subtle"
                    onChange={(e) => setMode(e.target.value as 'native' | 'docker')}
                  >
                    {item.supports_native ? (
                      <option value="native" disabled={!nativeReady}>
                        Host driver (script setup)
                      </option>
                    ) : null}
                    {item.supports_docker ? (
                      <option value="docker" disabled={!dockerReady}>
                        Docker container
                      </option>
                    ) : null}
                  </NativeSelect.Field>
                </NativeSelect.Root>
                {mode === 'native' && !nativeReady ? (
                  <Text fontSize="xs" color="fg.subtle">
                    Native drivers install on Linux VPS hosts (apt/yum). Use Docker or connect
                    external on this machine.
                  </Text>
                ) : null}
                {mode === 'docker' && !dockerReady ? (
                  <Text fontSize="xs" color="fg.subtle">
                    Install Docker Engine from Tools → Docker first.
                  </Text>
                ) : null}
              </VStack>

              <VStack align="stretch" gap={1.5}>
                <Text fontSize="sm" fontWeight="medium">
                  Version
                </Text>
                <NativeSelect.Root size="sm">
                  <NativeSelect.Field
                    value={version}
                    borderRadius="var(--radius-input)"
                    borderColor="border.subtle"
                    onChange={(e) => setVersion(e.target.value)}
                  >
                    {versions.map((v) => (
                      <option key={v} value={v}>
                        v{v}
                      </option>
                    ))}
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </VStack>

              <VStack align="stretch" gap={1.5}>
                <Text fontSize="sm" fontWeight="medium">
                  Port
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

              {mode === 'docker' && item.docker_image ? (
                <Text fontSize="xs" color="fg.subtle" fontFamily="mono">
                  Image tag follows version selection (base: {item.docker_image})
                </Text>
              ) : null}
              {mode === 'native' ? (
                <Text fontSize="xs" color="fg.subtle">
                  Platform: {env?.platform ?? 'unknown'} · runs setup script with sudo on the VPS
                </Text>
              ) : null}
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <HStack gap={2} w="full" justify="flex-end">
              <Button size="sm" variant="outline" borderColor="border.subtle" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                colorPalette={accentPalette}
                loading={installing}
                disabled={!canInstall || !version || !port}
                onClick={() =>
                  onConfirm({
                    pluginId: item.id,
                    mode,
                    version,
                    port: Number(port),
                  })
                }
              >
                Install
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
