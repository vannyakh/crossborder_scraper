import { Box, Text } from '@chakra-ui/react'
import { useStoreEnvironmentQuery } from '../../hooks/queries/use-store-query'
import { useLocale } from '../../hooks/use-locale'
import { Panel, PanelBody, PanelHeader } from '../ui/Panel'
import { DataListEmpty } from '../ui/DataList'
import { FormFieldsSkeleton } from '../ui/PanelSkeleton'
import { StatusBadge } from '../ui/StatusBadge'

export function DatabaseSqlitePanel() {
  const { t } = useLocale()
  const env = useStoreEnvironmentQuery()
  const sqlite = env.data?.builtin_sqlite

  if (env.isLoading) {
    return (
      <Panel>
        <PanelHeader title={t('db.sqlite.label')} description={t('db.sqlite.description')} />
        <PanelBody>
          <FormFieldsSkeleton fields={2} />
        </PanelBody>
      </Panel>
    )
  }

  if (!sqlite) {
    return <DataListEmpty>{t('db.sqlite.unavailable')}</DataListEmpty>
  }

  return (
    <Panel>
      <PanelHeader
        title={sqlite.label}
        description={sqlite.description || t('db.sqlite.description')}
        action={<StatusBadge status="success" label={t('db.sqlite.builtIn')} />}
      />
      <PanelBody>
        <Box
          p={3}
          borderRadius="var(--radius-input)"
          bg="bg.input"
          borderWidth="1px"
          borderColor="border.subtle"
        >
          <Text fontSize="xs" color="fg.muted" mb={1}>
            {t('db.sqlite.pathLabel')}
          </Text>
          <Text fontFamily="mono" fontSize="sm" wordBreak="break-all">
            {sqlite.path}
          </Text>
        </Box>
        <Text mt={3} fontSize="sm" color="fg.muted" lineHeight="tall">
          {t('db.sqlite.hint')}
        </Text>
      </PanelBody>
    </Panel>
  )
}
