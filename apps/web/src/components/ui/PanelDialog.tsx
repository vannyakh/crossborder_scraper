import { Dialog, IconButton, Portal } from '@chakra-ui/react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Centered panel modal — Portal + unmount on close so backdrop does not block the UI.
 */
export function PanelDialog({
  open,
  onClose,
  title,
  children,
  footer,
  maxW = 'md',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  maxW?: string
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) onClose()
      }}
      lazyMount
      unmountOnExit
      placement="center"
    >
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
              borderBottomWidth={footer ? '1px' : undefined}
              borderColor="border.subtle"
              flexShrink={0}
              py={3}
              pr={12}
            >
              <Dialog.Title fontSize="md" fontWeight="semibold" lineClamp={2}>
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
            {footer ? (
              <Dialog.Footer
                borderTopWidth="1px"
                borderColor="border.subtle"
                flexShrink={0}
                py={3}
                px={4}
              >
                {footer}
              </Dialog.Footer>
            ) : null}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
