import { Box, Button, Tabs } from '@chakra-ui/react'
import { RefreshCw } from 'lucide-react'
import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  DATABASE_ENGINE_TABS,
  DEFAULT_DATABASE_ENGINE,
  databaseEnginePath,
  type DatabaseEngineId,
} from '../../lib/databases/registry'
import {
  useStoreEnvironmentQuery,
  useStoreInstalledQuery,
} from '../../hooks/queries/use-store-query'
import { useLocale } from '../../hooks/use-locale'
import { resolveDatabaseEngine } from './database-sections'
import { DatabaseEnginePanel } from './DatabaseEnginePanel'
import { DatabaseSqlitePanel } from './DatabaseSqlitePanel'

export function DatabasePanels() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const { section: sectionParam } = useParams<{ section?: string }>()
  const engine = resolveDatabaseEngine(sectionParam)

  const env = useStoreEnvironmentQuery()
  const installed = useStoreInstalledQuery()

  const tabItems = useMemo(
    () =>
      DATABASE_ENGINE_TABS.map((tab) => ({
        value: tab.id,
        label: t(tab.labelKey),
      })),
    [t],
  )

  if (!engine || sectionParam !== engine) {
    return <Navigate to={databaseEnginePath(engine ?? DEFAULT_DATABASE_ENGINE)} replace />
  }

  const activeTab = DATABASE_ENGINE_TABS.find((tab) => tab.id === engine)

  function setEngine(next: DatabaseEngineId) {
    navigate(databaseEnginePath(next))
  }

  return (
    <>
      <Box
        mb={4}
        pb={3}
        borderBottomWidth="1px"
        borderColor="border.subtle"
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        flexWrap="wrap"
        gap={3}
      >
        <Box minW={0}>
          <Box fontSize="lg" fontWeight="semibold" letterSpacing="-0.01em">
            {t('db.pageTitle')}
          </Box>
          <Box mt={0.5} fontSize="sm" color="fg.muted">
            {t('db.pageDescription')}
          </Box>
        </Box>
        <Button
          size="sm"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="input"
          flexShrink={0}
          loading={installed.isFetching || env.isFetching}
          onClick={() => {
            void installed.refetch()
            void env.refetch()
          }}
        >
          <RefreshCw size={14} />
          {t('db.refresh')}
        </Button>
      </Box>

      <Tabs.Root
        value={engine}
        onValueChange={(details) => setEngine(details.value as DatabaseEngineId)}
        variant="line"
        size="sm"
        mb={4}
      >
        <Tabs.List borderColor="border.subtle" flexWrap="wrap">
          {tabItems.map((tab) => (
            <Tabs.Trigger key={tab.value} value={tab.value}>
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>

      {engine === 'sqlite' || !activeTab?.pluginId ? (
        <DatabaseSqlitePanel />
      ) : (
        <DatabaseEnginePanel pluginId={activeTab.pluginId} />
      )}
    </>
  )
}
