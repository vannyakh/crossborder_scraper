import { Box, IconButton, Text, VStack } from '@chakra-ui/react'
import { Tooltip } from '@/components/ui/tooltip'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useAccentPalette } from '../../hooks/use-ui-config'

export type FlowCanvasMenuId = 'layout' | 'display' | null

type ToolbarButtonProps = {
  'aria-label': string
  active?: boolean
  onClick: () => void
  children: ReactNode
}

export function FlowCanvasToolbarShell({
  openMenu,
  onCloseMenu,
  children,
}: {
  openMenu: FlowCanvasMenuId
  onCloseMenu: () => void
  children: ReactNode
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openMenu) return
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as HTMLElement)) {
        onCloseMenu()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [openMenu, onCloseMenu])

  return (
    <Box
      ref={rootRef}
      className="project-flow-canvas-toolbar"
      position="absolute"
      left={3}
      bottom={3}
      zIndex={8}
    >
      <VStack gap={2} align="center">
        {children}
      </VStack>
    </Box>
  )
}

export function FlowCanvasToolbarPill({
  children,
  menuOpen,
  flyout,
}: {
  children: ReactNode
  menuOpen?: boolean
  flyout?: ReactNode
}) {
  return (
    <VStack
      className={`project-flow-canvas-toolbar__pill${menuOpen ? ' is-menu-open' : ''}`}
      gap={0}
      position="relative"
    >
      {children}
      {flyout}
    </VStack>
  )
}

export function FlowCanvasToolbarDivider() {
  return <Box className="project-flow-canvas-toolbar__divider" aria-hidden />
}

export function FlowCanvasToolbarButton({
  'aria-label': ariaLabel,
  active,
  onClick,
  children,
}: ToolbarButtonProps) {
  const accentPalette = useAccentPalette()

  return (
    <IconButton
      className="project-flow-canvas-toolbar__btn"
      aria-label={ariaLabel}
      size="sm"
      variant={active ? 'subtle' : 'ghost'}
      colorPalette={active ? accentPalette : undefined}
      onClick={onClick}
    >
      {children}
    </IconButton>
  )
}

export function FlowCanvasToolbarMenuAnchor({
  menuId,
  openMenu,
  label,
  icon: Icon,
  onToggle,
  flyoutAlign = 'start',
  children,
}: {
  menuId: Exclude<FlowCanvasMenuId, null>
  openMenu: FlowCanvasMenuId
  label: string
  icon: LucideIcon
  onToggle: (menu: FlowCanvasMenuId) => void
  flyoutAlign?: 'start' | 'end'
  children: ReactNode
}) {
  const isOpen = openMenu === menuId

  return (
    <Box className="project-flow-canvas-toolbar__anchor">
      <FlowCanvasToolbarPill
        menuOpen={isOpen}
        flyout={
          isOpen ? (
            <Box
              className={`project-flow-canvas-flyout project-flow-canvas-flyout--${flyoutAlign}`}
            >
              {children}
            </Box>
          ) : null
        }
      >
        <FlowCanvasToolbarButton
          aria-label={label}
          active={isOpen}
          onClick={() => onToggle(isOpen ? null : menuId)}
        >
          <Icon size={16} strokeWidth={1.75} />
        </FlowCanvasToolbarButton>
      </FlowCanvasToolbarPill>
    </Box>
  )
}

export function FlowCanvasToolbarActionGroup({
  items,
}: {
  items: Array<{
    key: string
    label: string
    icon: LucideIcon
    onClick: () => void
    active?: boolean
    badge?: number
  }>
}) {
  return (
    <FlowCanvasToolbarPill>
      {items.map((item, index) => (
        <Box key={item.key} display="contents">
          {index > 0 ? <FlowCanvasToolbarDivider /> : null}
          <Tooltip
            content={item.label}
            positioning={{ placement: 'top' }}
            openDelay={200}
            showArrow
          >
            <Box position="relative" display="inline-flex">
              <FlowCanvasToolbarButton
                aria-label={item.label}
                active={item.active}
                onClick={item.onClick}
              >
                <item.icon size={16} strokeWidth={1.75} />
              </FlowCanvasToolbarButton>
              {item.badge != null && item.badge > 0 ? (
                <Box className="project-flow-console__toolbar-badge" aria-hidden>
                  {item.badge > 99 ? '99+' : item.badge}
                </Box>
              ) : null}
            </Box>
          </Tooltip>
        </Box>
      ))}
    </FlowCanvasToolbarPill>
  )
}

export function FlowCanvasFlyout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box className="project-flow-canvas-flyout__panel" role="menu">
      <Text
        className="project-flow-canvas-flyout__title"
        fontSize="xs"
        fontWeight="semibold"
        px={3}
        pt={2}
        pb={1}
      >
        {title}
      </Text>
      <VStack align="stretch" gap={0} pb={1}>
        {children}
      </VStack>
    </Box>
  )
}

export function FlowCanvasFlyoutOption({
  icon: Icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`project-flow-canvas-option${active ? ' is-active' : ''}`}
      onClick={onClick}
    >
      <Box className="project-flow-canvas-option__icon" aria-hidden>
        <Icon size={16} strokeWidth={1.75} />
      </Box>
      <Box minW={0} textAlign="left">
        <Text fontSize="sm" fontWeight="medium">
          {title}
        </Text>
        <Text fontSize="xs" color="fg.muted" lineClamp={2}>
          {subtitle}
        </Text>
      </Box>
    </button>
  )
}
