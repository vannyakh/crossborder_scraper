import { Box, HoverCard, Portal } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useState } from 'react'

const FLYOUT_POSITIONING = {
  placement: 'right-start' as const,
  gutter: 6,
  strategy: 'fixed' as const,
  overlap: false,
}

type SidebarCollapsedHoverProps = {
  label: string
  active?: boolean
  /** Shorter delay for simple label tips; longer for submenu flyouts */
  variant?: 'tip' | 'menu'
  children: ReactNode
  content: ReactNode
}

export function SidebarCollapsedHover({
  label,
  active = false,
  variant = 'menu',
  children,
  content,
}: SidebarCollapsedHoverProps) {
  const [open, setOpen] = useState(false)
  const openDelay = variant === 'tip' ? 180 : 80
  const closeDelay = variant === 'tip' ? 80 : 280

  return (
    <HoverCard.Root
      onOpenChange={(details) => setOpen(details.open)}
      openDelay={openDelay}
      closeDelay={closeDelay}
      positioning={FLYOUT_POSITIONING}
    >
      <HoverCard.Trigger asChild>
        <Box
          as="span"
          display="flex"
          justifyContent="center"
          w="full"
          className="sidebar-collapsed-hover-trigger"
          data-open={open ? '' : undefined}
          data-active={active || open ? '' : undefined}
          aria-label={label}
        >
          {children}
        </Box>
      </HoverCard.Trigger>

      <Portal>
        <HoverCard.Positioner zIndex={50} className="sidebar-collapsed-hover-positioner">
          <HoverCard.Content
            p={0}
            m={0}
            bg="transparent"
            border="none"
            boxShadow="none"
            minW={0}
            overflow="visible"
            className="sidebar-collapsed-hover-content"
          >
            {/* Invisible bridge so the pointer can reach the flyout without closing */}
            <Box className="sidebar-collapsed-hover-bridge">{content}</Box>
          </HoverCard.Content>
        </HoverCard.Positioner>
      </Portal>
    </HoverCard.Root>
  )
}

export function SidebarCollapsedLabelTip({ label }: { label: string }) {
  return (
    <Box className="sidebar-collapsed-tip" role="tooltip">
      {label}
    </Box>
  )
}
