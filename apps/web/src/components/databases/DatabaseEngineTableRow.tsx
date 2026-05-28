import { Button, Table } from '@chakra-ui/react'
import { Settings } from 'lucide-react'
import { useLocale } from '../../hooks/use-locale'
import type { StoreDatabaseEntry } from '../../lib/api'
import { ClickToCopyText } from './ClickToCopyText'

export function DatabaseEngineTableRow({
  database,
  onConfigure,
}: {
  database: StoreDatabaseEntry
  onConfigure: (row: StoreDatabaseEntry) => void
}) {
  const { t } = useLocale()
  const password = database.password || ''
  const locationLabel =
    database.access === 'remote' ? t('db.table.locationRemote') : t('db.table.locationLocal')

  return (
    <Table.Row _hover={{ bg: 'bg.panelHover' }}>
      <Table.Cell fontWeight="medium">
        <ClickToCopyText value={database.name} />
      </Table.Cell>
      <Table.Cell>
        <ClickToCopyText value={database.username || '—'} mono />
      </Table.Cell>
      <Table.Cell>
        <ClickToCopyText value={password || '—'} masked={Boolean(password)} mono />
      </Table.Cell>
      <Table.Cell fontSize="sm" color="fg.muted">
        {locationLabel}
      </Table.Cell>
      <Table.Cell textAlign="right">
        <Button
          size="xs"
          variant="ghost"
          colorPalette="green"
          borderRadius="input"
          onClick={() => onConfigure(database)}
        >
          <Settings size={14} />
          {t('db.table.action')}
        </Button>
      </Table.Cell>
    </Table.Row>
  )
}
