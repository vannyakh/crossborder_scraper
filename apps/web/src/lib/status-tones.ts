/**
 * Shared status → Chakra colour-palette tone mappers.
 *
 * Domain-specific mappers (schedule, skill, rule, project health) stay in their
 * feature files and may call these primitives where appropriate.
 */

export type PanelTone = 'success' | 'danger' | 'warning' | 'neutral' | 'running'

/** Boolean ok → success / danger / neutral. */
export function boolTone(ok: boolean | undefined | null): 'success' | 'danger' | 'neutral' {
  if (ok === true) return 'success'
  if (ok === false) return 'danger'
  return 'neutral'
}

/** Map a scrape/batch job status string to a display tone. */
export function batchStatusTone(status: string | undefined | null): PanelTone {
  switch (status) {
    case 'completed':
      return 'success'
    case 'failed':
    case 'error':
      return 'danger'
    case 'running':
    case 'pending':
      return 'running'
    case 'cancelled':
      return 'neutral'
    default:
      return 'neutral'
  }
}

/** Map an App Store / driver install status to a display tone. */
export function storeStatusTone(status: string | undefined | null): PanelTone {
  switch (status) {
    case 'running':
    case 'external':
      return 'success'
    case 'installing':
    case 'starting':
    case 'stopping':
      return 'running'
    case 'error':
    case 'failed':
      return 'danger'
    case 'stopped':
    case 'not_installed':
    default:
      return 'neutral'
  }
}

/** Map a Docker container/service status to a display tone. */
export function dockerStatusTone(status: string | undefined | null): PanelTone {
  switch (status) {
    case 'running':
      return 'success'
    case 'stopped':
    case 'exited':
    case 'dead':
      return 'danger'
    case 'starting':
    case 'paused':
    case 'restarting':
      return 'running'
    default:
      return 'neutral'
  }
}

/** Map a generic enabled/disabled flag. */
export function enabledTone(enabled: boolean | undefined | null): 'success' | 'neutral' {
  return enabled ? 'success' : 'neutral'
}

/** Convert a 0-1 ratio to a health tone (services online / total). */
export function ratioHealthTone(ratio: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (ratio >= 1) return 'success'
  if (ratio > 0) return 'warning'
  if (ratio === 0) return 'danger'
  return 'neutral'
}
