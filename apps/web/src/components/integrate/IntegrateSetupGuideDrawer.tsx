import { Box, Button, Dialog, Drawer, HStack, IconButton, Portal, Text } from '@chakra-ui/react'
import { BookOpen, Maximize2, X } from 'lucide-react'
import { useState } from 'react'
import type { IntegrateChannelDetail } from '../../lib/api'
import { MarkdownContent } from '../ui/MarkdownContent'
import { StatusBadge } from '../ui/StatusBadge'

function channelStatusTone(channel: IntegrateChannelDetail): 'success' | 'neutral' | 'running' {
  if (channel.runtime_active) return 'success'
  if (channel.configured) return 'running'
  return 'neutral'
}

function channelStatusLabel(channel: IntegrateChannelDetail): string {
  if (channel.runtime_active) return 'live'
  if (channel.enabled && channel.configured) return 'enabled'
  if (channel.configured) return 'configured'
  return 'not configured'
}

function IntegrateSetupGuideBody({ channel }: { channel: IntegrateChannelDetail }) {
  if (!channel.setup_guide_md) {
    return (
      <Text fontSize="sm" color="fg.muted">
        No setup guide available for this channel.
      </Text>
    )
  }
  return <MarkdownContent source={channel.setup_guide_md} />
}

function GuideHeaderMeta({ channel }: { channel: IntegrateChannelDetail }) {
  return (
    <HStack mt={1.5} gap={2} flexWrap="wrap">
      <StatusBadge status={channelStatusTone(channel)} label={channelStatusLabel(channel)} />
      <Text fontSize="xs" color="fg.muted" lineClamp={1}>
        {channel.description}
      </Text>
    </HStack>
  )
}

export function IntegrateSetupGuideFullDialog({
  channel,
  open,
  onClose,
}: {
  channel: IntegrateChannelDetail | null
  open: boolean
  onClose: () => void
}) {
  if (!channel) return null

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
            maxW="960px"
            h={{ base: '100%', md: 'min(92vh, 880px)' }}
            maxH={{ base: '100%', md: '92vh' }}
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
              <Dialog.Title fontWeight="semibold">{channel.label} setup guide</Dialog.Title>
              <GuideHeaderMeta channel={channel} />
              <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                <IconButton size="sm" variant="ghost" aria-label="Close guide">
                  <X size={16} />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body
              px={{ base: 4, md: 6 }}
              py={5}
              overflow="auto"
              className="app-scroll"
              flex={1}
            >
              <Box maxW="720px" mx="auto">
                <IntegrateSetupGuideBody channel={channel} />
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

export function IntegrateSetupGuideDrawer({
  channel,
  open,
  onClose,
  onExpand,
}: {
  channel: IntegrateChannelDetail | null
  open: boolean
  onClose: () => void
  onExpand: () => void
}) {
  if (!channel) return null

  return (
    <Drawer.Root open={open} onOpenChange={(d) => !d.open && onClose()} placement="end" size="md">
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content bg="bg.elevated" maxW={{ base: 'full', sm: '480px' }}>
            <Drawer.Header borderBottomWidth="1px" borderColor="border.subtle" py={4}>
              <HStack justify="space-between" align="start" w="full" gap={3}>
                <Box minW={0} flex={1}>
                  <Drawer.Title fontWeight="semibold" lineClamp={1}>
                    {channel.label} setup
                  </Drawer.Title>
                  <GuideHeaderMeta channel={channel} />
                </Box>
                <HStack gap={0} flexShrink={0}>
                  <IconButton
                    aria-label="Open full page guide"
                    size="sm"
                    variant="ghost"
                    onClick={onExpand}
                  >
                    <Maximize2 size={16} />
                  </IconButton>
                  <IconButton aria-label="Close guide" size="sm" variant="ghost" onClick={onClose}>
                    <X size={16} />
                  </IconButton>
                </HStack>
              </HStack>
            </Drawer.Header>

            <Drawer.Body py={4} className="app-scroll">
              <IntegrateSetupGuideBody channel={channel} />
            </Drawer.Body>

            <Drawer.Footer borderTopWidth="1px" borderColor="border.subtle" gap={2}>
              <Button size="sm" variant="outline" borderColor="border.subtle" onClick={onExpand}>
                <Maximize2 size={14} />
                Full page
              </Button>
              <Button size="sm" variant="outline" borderColor="border.subtle" onClick={onClose}>
                Close
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}

export function IntegrateSetupGuideButton({
  onOpenDrawer,
  onOpenFull,
}: {
  onOpenDrawer: () => void
  onOpenFull: () => void
}) {
  return (
    <HStack gap={1}>
      <Button size="sm" variant="outline" borderColor="border.subtle" onClick={onOpenDrawer}>
        <BookOpen size={14} />
        Setup guide
      </Button>
      <IconButton
        aria-label="Open setup guide full page"
        size="sm"
        variant="outline"
        borderColor="border.subtle"
        onClick={onOpenFull}
      >
        <Maximize2 size={14} />
      </IconButton>
    </HStack>
  )
}

/** Drawer + full-page dialog for integrate channel setup guides. */
export function IntegrateSetupGuideViews({
  channel,
  drawerOpen,
  fullOpen,
  onDrawerOpenChange,
  onFullOpenChange,
}: {
  channel: IntegrateChannelDetail | null
  drawerOpen: boolean
  fullOpen: boolean
  onDrawerOpenChange: (open: boolean) => void
  onFullOpenChange: (open: boolean) => void
}) {
  function openFull() {
    onDrawerOpenChange(false)
    onFullOpenChange(true)
  }

  return (
    <>
      <IntegrateSetupGuideDrawer
        channel={channel}
        open={drawerOpen}
        onClose={() => onDrawerOpenChange(false)}
        onExpand={openFull}
      />
      <IntegrateSetupGuideFullDialog
        channel={channel}
        open={fullOpen}
        onClose={() => onFullOpenChange(false)}
      />
    </>
  )
}

export function useIntegrateSetupGuideState() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [fullOpen, setFullOpen] = useState(false)
  return {
    drawerOpen,
    fullOpen,
    openDrawer: () => setDrawerOpen(true),
    openFull: () => setFullOpen(true),
    setDrawerOpen,
    setFullOpen,
  }
}
