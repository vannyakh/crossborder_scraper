import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { useModuleProfileQuery } from '../../hooks/queries/use-module-profiles-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { MarkdownContent } from '../ui/MarkdownContent'
import { FormFieldsSkeleton } from '../ui/PanelSkeleton'

export function ModuleGuidePanel({ moduleId }: { moduleId: string | null }) {
  const accentPalette = useAccentPalette()
  const profileQuery = useModuleProfileQuery(moduleId, Boolean(moduleId))

  if (profileQuery.isLoading) {
    return <FormFieldsSkeleton fields={4} />
  }

  const profile = profileQuery.data
  if (!profile?.body_md) {
    return (
      <Text fontSize="sm" color="fg.muted">
        No module guide available yet.
      </Text>
    )
  }

  return (
    <Box>
      {profile.summary ? (
        <Text fontSize="sm" color="fg.muted" mb={3} lineHeight="tall">
          {profile.summary}
        </Text>
      ) : null}
      {profile.links.length > 0 ? (
        <HStack gap={2} flexWrap="wrap" mb={4}>
          {profile.links.map((link) => (
            <Button
              key={link.path}
              asChild
              size="xs"
              variant="outline"
              borderColor="border.subtle"
              borderRadius="input"
              colorPalette={accentPalette}
            >
              <RouterLink to={link.path}>{link.label}</RouterLink>
            </Button>
          ))}
        </HStack>
      ) : null}
      <MarkdownContent source={profile.body_md} />
    </Box>
  )
}
