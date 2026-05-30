/** Splitter + CSS bounds for the flow live-log console panel. */

/** Minimized strip — header only (~2.35rem). */
export const FLOW_CONSOLE_MINIMIZED_PCT = 6

/** Expanded panel defaults and drag limits (Splitter percentages). */
export const FLOW_CONSOLE_EXPANDED_MIN_PCT = 18
export const FLOW_CONSOLE_EXPANDED_MAX_PCT = 48
export const FLOW_CONSOLE_DEFAULT_EXPANDED_PCT = 28

/** Thresholds when syncing drag ↔ expanded state. */
export const FLOW_CONSOLE_EXPANDED_THRESHOLD_PCT = 12
export const FLOW_CONSOLE_MINIMIZED_THRESHOLD_PCT = 8

export function clampExpandedLogPct(pct: number): number {
  return Math.min(FLOW_CONSOLE_EXPANDED_MAX_PCT, Math.max(FLOW_CONSOLE_EXPANDED_MIN_PCT, pct))
}

export function expandedCanvasSplit(logPct: number): [number, number] {
  const logs = clampExpandedLogPct(logPct)
  return [100 - logs, logs]
}

export function minimizedCanvasSplit(): [number, number] {
  return [100 - FLOW_CONSOLE_MINIMIZED_PCT, FLOW_CONSOLE_MINIMIZED_PCT]
}

export function hiddenCanvasSplit(): [number, number] {
  return [100, 0]
}
