import { Dialog, IconButton, Portal } from '@chakra-ui/react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

/** Centered modal shell for agent cron dialogs (Chakra Dialog). */
export function AgentModalPanel({
  open,
  onClose,
  title,
  children,
  maxW = '720px',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxW?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner display="flex" alignItems="center" justifyContent="center" p={4}>
          <Dialog.Content
            maxW={maxW}
            maxH="85vh"
            display="flex"
            flexDirection="column"
            bg="bg.panel"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="var(--radius-panel)"
            boxShadow="lg"
          >
            <Dialog.Header
              borderBottomWidth="1px"
              borderColor="border.subtle"
              flexShrink={0}
              py={3}
              pr={12}
            >
              <Dialog.Title fontSize="md" fontWeight="semibold" lineClamp={1}>
                {title}
              </Dialog.Title>
              <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                <IconButton size="sm" variant="ghost" aria-label="Close">
                  <X size={16} />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body px={4} py={4} overflow="auto" className="app-scroll" flex={1}>
              {children}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
