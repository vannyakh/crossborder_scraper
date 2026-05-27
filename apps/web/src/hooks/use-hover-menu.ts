import { useEffect, useRef, useState } from 'react'

/** Open on pointer enter, close after a short delay on leave (for header menus). */
export function useHoverMenu(closeDelayMs = 150) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const openMenu = () => {
    clearCloseTimer()
    setOpen(true)
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setOpen(false), closeDelayMs)
  }

  useEffect(() => () => clearCloseTimer(), [])

  return {
    open,
    setOpen,
    hoverHandlers: {
      onMouseEnter: openMenu,
      onMouseLeave: scheduleClose,
    },
  }
}
