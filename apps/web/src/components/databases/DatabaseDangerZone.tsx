import { Box, Button, Text, VStack } from '@chakra-ui/react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import {
  useStoreDropDatabaseMutation,
  useStoreUninstallMutation,
} from '../../hooks/queries/use-store-query'
import { useLocale } from '../../hooks/use-locale'
import { notifyError, notifySuccess } from '../../lib/toast'
import type { StoreDatabaseEntry, StoreInstalled } from '../../lib/api'
import { SectionCard } from '../ui/Section'

export function DatabaseDangerZone({
  pluginId,
  serviceName,
  installation,
  databases,
  onClose,
  onDropped,
}: {
  pluginId: string
  serviceName: string
  installation: StoreInstalled
  databases: StoreDatabaseEntry[]
  onClose: () => void
  onDropped?: () => void
}) {
  const { t } = useLocale()
  const uninstallMutation = useStoreUninstallMutation()
  const dropMutation = useStoreDropDatabaseMutation()
  const busy = uninstallMutation.isPending || dropMutation.isPending
  const canDrop = ['mysql', 'postgresql', 'mongodb'].includes(pluginId)

  async function handleUninstall() {
    const prompt = t('db.danger.uninstallConfirm', { name: serviceName })
    if (!confirm(prompt)) return
    try {
      await uninstallMutation.mutateAsync(pluginId)
      notifySuccess(t('db.danger.uninstallDone', { name: serviceName }))
      onClose()
    } catch (err) {
      notifyError(err)
    }
  }

  async function handleDropDatabase(row: StoreDatabaseEntry) {
    const prompt = t('db.danger.dropConfirm', { name: row.name })
    if (!confirm(prompt)) return
    try {
      await dropMutation.mutateAsync({ pluginId, databaseName: row.name })
      notifySuccess(t('db.danger.dropDone', { name: row.name }))
      onDropped?.()
    } catch (err) {
      notifyError(err)
    }
  }

  return (
    <VStack align="stretch" gap={4}>
      <Box
        px={3}
        py={2}
        borderRadius="var(--radius-input)"
        borderWidth="1px"
        borderColor="orange.200"
        bg="orange.subtle"
      >
        <Text fontSize="xs" color="fg.muted" lineHeight="tall">
          {t('db.danger.intro')}
        </Text>
      </Box>

      {canDrop ? (
        <SectionCard>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            {t('db.danger.dropTitle')}
          </Text>
          <Text fontSize="xs" color="fg.muted" mb={3} lineHeight="tall">
            {t('db.danger.dropHint')}
          </Text>
          {databases.length ? (
            <VStack align="stretch" gap={2}>
              {databases.map((row) => (
                <Box
                  key={row.name}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={3}
                  py={2}
                  px={3}
                  borderWidth="1px"
                  borderColor="border.subtle"
                  borderRadius="var(--radius-input)"
                  bg="bg.elevated"
                >
                  <Box minW={0}>
                    <Text fontSize="sm" fontWeight="medium" fontFamily="mono">
                      {row.name}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {row.username}
                      {row.legacy ? ` · ${t('db.danger.legacy')}` : ''}
                    </Text>
                  </Box>
                  <Button
                    size="xs"
                    variant="outline"
                    colorPalette="red"
                    borderRadius="input"
                    disabled={busy}
                    onClick={() => void handleDropDatabase(row)}
                  >
                    <Trash2 size={14} />
                    {t('db.danger.drop')}
                  </Button>
                </Box>
              ))}
            </VStack>
          ) : (
            <Text fontSize="sm" color="fg.muted">
              {t('db.danger.noDatabases')}
            </Text>
          )}
        </SectionCard>
      ) : null}

      <SectionCard borderColor="red.200">
        <HStackIcon />
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          {t('db.danger.uninstallTitle')}
        </Text>
        <Text fontSize="xs" color="fg.muted" mb={3} lineHeight="tall">
          {t('db.danger.uninstallHint', { mode: installation.mode ?? '—' })}
        </Text>
        <Button
          size="sm"
          variant="outline"
          colorPalette="red"
          width="full"
          borderRadius="input"
          disabled={busy}
          onClick={() => void handleUninstall()}
        >
          <AlertTriangle size={14} />
          {t('db.danger.uninstall')}
        </Button>
      </SectionCard>
    </VStack>
  )
}

function HStackIcon() {
  return (
    <Box mb={2} color="red.500" aria-hidden>
      <AlertTriangle size={16} />
    </Box>
  )
}
