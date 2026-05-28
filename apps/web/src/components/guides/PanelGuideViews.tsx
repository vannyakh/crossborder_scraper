import { Box, Button, Dialog, HStack, IconButton, Portal, Text } from '@chakra-ui/react'
import { BookOpen, X } from 'lucide-react'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import type { PanelGuideDetail, PanelGuideSummary } from '../../lib/api'
import { usePanelGuideQuery } from '../../hooks/queries/use-panel-guides-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { MarkdownContent } from '../ui/MarkdownContent'
import { FormFieldsSkeleton } from '../ui/PanelSkeleton'
import { StatusBadge } from '../ui/StatusBadge'

const CATEGORY_TONE = {
  agent: 'brand',
  scrape: 'neutral',
  panel: 'neutral',
  integrate: 'success',
} as const

function GuideLinks({ guide, onNavigate }: { guide: PanelGuideSummary; onNavigate?: () => void }) {
  const accentPalette = useAccentPalette()
  if (!guide.links.length) return null

  return (
    <HStack gap={2} flexWrap="wrap" pt={2}>
      {guide.links.map((link) => (
        <Button
          key={link.path}
          asChild
          size="xs"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="input"
          colorPalette={accentPalette}
        >
          <RouterLink to={link.path} onClick={onNavigate}>
            {link.label}
          </RouterLink>
        </Button>
      ))}
    </HStack>
  )
}

function PanelGuideBody({
  guide,
  loading,
}: {
  guide: PanelGuideDetail | undefined
  loading: boolean
}) {
  if (loading) {
    return <FormFieldsSkeleton fields={4} />
  }
  if (!guide?.body_md) {
    return (
      <Text fontSize="sm" color="fg.muted">
        No setup guide available.
      </Text>
    )
  }
  return <MarkdownContent source={guide.body_md} />
}

export function PanelGuideDialog({
  guideId,
  open,
  onClose,
}: {
  guideId: string | null
  open: boolean
  onClose: () => void
}) {
  const { data: guide, isLoading } = usePanelGuideQuery(guideId, open)

  if (!guideId) return null

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={{ base: 2, md: 4 }}
        >
          <Dialog.Content
            w="full"
            maxW="720px"
            maxH={{ base: '100%', md: 'min(88vh, 820px)' }}
            display="flex"
            flexDirection="column"
            bg="bg.elevated"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius={{ base: 0, md: 'var(--radius-panel)' }}
            boxShadow="lg"
            overflow="hidden"
          >
            <Dialog.Header
              borderBottomWidth="1px"
              borderColor="border.subtle"
              flexShrink={0}
              py={4}
              pr={12}
            >
              <Dialog.Title fontWeight="semibold" lineClamp={2}>
                {guide?.title ?? 'Setup guide'}
              </Dialog.Title>
              {guide ? (
                <HStack mt={1.5} gap={2} flexWrap="wrap">
                  <StatusBadge
                    status={CATEGORY_TONE[guide.category]}
                    label={guide.category_label}
                  />
                  <HStack gap={1.5} color="fg.muted">
                    <BookOpen size={14} />
                    <Text fontSize="xs">{guide.summary}</Text>
                  </HStack>
                </HStack>
              ) : null}
              <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                <IconButton size="sm" variant="ghost" aria-label="Close guide">
                  <X size={16} />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body
              px={{ base: 4, md: 5 }}
              py={4}
              overflow="auto"
              className="app-scroll"
              flex={1}
            >
              <Box maxW="640px" mx="auto">
                <PanelGuideBody guide={guide} loading={isLoading} />
                {guide ? <GuideLinks guide={guide} onNavigate={onClose} /> : null}
              </Box>
            </Dialog.Body>
            <Dialog.Footer borderTopWidth="1px" borderColor="border.subtle" flexShrink={0} gap={2}>
              <Button size="sm" variant="outline" borderColor="border.subtle" onClick={onClose}>
                Close
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export function usePanelGuideState() {
  const [guideId, setGuideId] = useState<string | null>(null)
  return {
    guideId,
    open: Boolean(guideId),
    openGuide: (id: string) => setGuideId(id),
    closeGuide: () => setGuideId(null),
  }
}

/** Dialog shell for panel setup guides (markdown from GET /guides/{id}). */
export function PanelGuideViews({
  guideId,
  open,
  onClose,
}: {
  guideId: string | null
  open: boolean
  onClose: () => void
}) {
  return <PanelGuideDialog guideId={guideId} open={open} onClose={onClose} />
}
