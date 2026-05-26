import { Box, Tabs } from '@chakra-ui/react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAccentPalette } from '../../hooks/use-ui-config'
import {
  INVENTORY_SECTIONS,
  inventorySectionPath,
  type InventorySectionId,
} from './inventory-sections'

export function InventoryTabNav({
  counts,
}: {
  counts?: Partial<Record<InventorySectionId, number>>
}) {
  const accentPalette = useAccentPalette()
  const { pathname } = useLocation()
  const active =
    INVENTORY_SECTIONS.find(
      (s) =>
        pathname === inventorySectionPath(s.id) ||
        pathname.startsWith(`${inventorySectionPath(s.id)}/`),
    )?.id ?? 'batches'

  return (
    <Tabs.Root value={active} variant="line" size="sm" colorPalette={accentPalette}>
      <Tabs.List mb={0} borderColor="border.subtle">
        {INVENTORY_SECTIONS.map((section) => (
          <Tabs.Trigger key={section.id} value={section.id} asChild px={3}>
            <NavLink to={inventorySectionPath(section.id)}>
              {section.label}
              {counts?.[section.id] != null ? (
                <Box as="span" ml={1.5} fontSize="xs" color="fg.muted">
                  {counts[section.id]}
                </Box>
              ) : null}
            </NavLink>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  )
}
