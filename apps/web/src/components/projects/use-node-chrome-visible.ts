import { useCallback, useEffect, useRef, useState } from 'react'

const HIDE_DELAY_MS = 140

/** Show node chrome on hover, selection, run, or while a menu is open. */
export function useNodeChromeVisible(options: {
  selected: boolean
  running?: boolean
  menuOpen?: boolean
}) {
  const { selected, running, menuOpen = false } = options
  const [hovered, setHovered] = useState(false)
  const hideTimerRef = useRef<number | undefined>(undefined)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== undefined) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = undefined
    }
  }, [])

  const pinHover = useCallback(() => {
    clearHideTimer()
    setHovered(true)
  }, [clearHideTimer])

  const scheduleHide = useCallback(() => {
    clearHideTimer()
    hideTimerRef.current = window.setTimeout(() => {
      setHovered(false)
      hideTimerRef.current = undefined
    }, HIDE_DELAY_MS)
  }, [clearHideTimer])

  useEffect(() => () => clearHideTimer(), [clearHideTimer])

  const visible = selected || running || menuOpen || hovered

  return {
    visible,
    nodeHoverHandlers: {
      onMouseEnter: pinHover,
      onMouseLeave: scheduleHide,
    },
    chromeHoverHandlers: {
      onMouseEnter: pinHover,
      onMouseLeave: scheduleHide,
    },
  }
}
