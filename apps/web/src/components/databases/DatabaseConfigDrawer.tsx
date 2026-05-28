import { Box, Button, Drawer, HStack, IconButton, Portal, Text, VStack } from '@chakra-ui/react'
import { Database, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreDatabaseConnectionView, StoreDatabaseEntry } from '../../lib/api'
import { DATABASE_CONFIG_SECTIONS, type DatabaseConfigSectionId } from './database-config-sections'
import { DatabaseConfigSectionBody } from './DatabaseConfigDrawerPanels'

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      size="sm"
      width="full"
      justifyContent="flex-start"
      variant={active ? 'subtle' : 'ghost'}
      bg={active ? 'bg.panelHover' : undefined}
      color={active ? 'fg' : 'fg.muted'}
      fontWeight={active ? 'semibold' : 'normal'}
      borderRadius="var(--radius-input)"
      onClick={onClick}
    >
      {label}
    </Button>
  )
}

export function DatabaseConfigDrawer({
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
  pluginId: string
  row: StoreDatabaseEntry | null
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
  const open = Boolean(row)
  const [section, setSection] = useState<DatabaseConfigSectionId>('database')

  useEffect(() => {
    if (open && row) {
      setSection('database')
    }
  }, [open, row?.name])

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose()
      }}
      placement="end"
      size="lg"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content maxW="840px" w="full" bg="bg.panel" borderRadius="var(--radius-panel)">
            <Drawer.Header borderBottomWidth="1px" borderColor="border.subtle" py={3}>
              <HStack gap={3}>
                <Box
                  p={2}
                  borderRadius="var(--radius-card)"
                  colorPalette={accentPalette}
                  bg="colorPalette.subtle"
                  color="colorPalette.fg"
                >
                  <Database size={20} />
                </Box>
                <Box minW={0}>
                  <Drawer.Title fontSize="md" fontWeight="semibold">
                    {row ? t('db.config.title', { name: row.name }) : ''}
                  </Drawer.Title>
                  {row?.username ? (
                    <Text fontSize="xs" color="fg.muted" fontFamily="mono">
                      {row.username}
                    </Text>
                  ) : null}
                </Box>
              </HStack>
              <Drawer.CloseTrigger asChild position="absolute" top={3} right={3}>
                <IconButton aria-label={t('db.create.cancel')} size="sm" variant="ghost">
                  <X size={16} />
                </IconButton>
              </Drawer.CloseTrigger>
            </Drawer.Header>

            <Drawer.Body p={0} display="flex" minH="420px" className="app-scroll">
              {row ? (
                <>
                  <Box
                    w="200px"
                    flexShrink={0}
                    borderRightWidth="1px"
                    borderColor="border.subtle"
                    p={3}
                    bg="bg.panelHover"
                  >
                    <VStack align="stretch" gap={0.5}>
                      {DATABASE_CONFIG_SECTIONS.map((item) => (
                        <NavItem
                          key={item.id}
                          label={t(item.labelKey)}
                          active={section === item.id}
                          onClick={() => setSection(item.id)}
                        />
                      ))}
                    </VStack>
                  </Box>
                  <Box flex={1} p={4} minW={0}>
                    <DatabaseConfigSectionBody
                      section={section}
                      pluginId={pluginId}
                      row={row}
                      connection={connection}
                      supportsOptimize={supportsOptimize}
                      supportsPermission={supportsPermission}
                      supportsInspect={supportsInspect}
                      canDrop={canDrop}
                      onClose={onClose}
                      onUpdated={onUpdated}
                    />
                  </Box>
                </>
              ) : null}
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}
