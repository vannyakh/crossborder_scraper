import { Box, Tabs } from '@chakra-ui/react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { ARTIFACT_SECTIONS, artifactSectionPath, type ArtifactSectionId } from './artifact-sections'

export function ArtifactTabNav({
  counts,
}: {
  counts?: Partial<Record<ArtifactSectionId, number>>
}) {
  const accentPalette = useAccentPalette()
  const { pathname } = useLocation()
  const active =
    ARTIFACT_SECTIONS.find(
      (s) =>
        pathname === artifactSectionPath(s.id) ||
        pathname.startsWith(`${artifactSectionPath(s.id)}/`),
    )?.id ?? 'products'

  return (
    <Tabs.Root value={active} variant="line" size="sm" colorPalette={accentPalette}>
      <Tabs.List mb={0} borderColor="border.subtle">
        {ARTIFACT_SECTIONS.map((section) => (
          <Tabs.Trigger key={section.id} value={section.id} asChild px={3}>
            <NavLink to={artifactSectionPath(section.id)}>
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
