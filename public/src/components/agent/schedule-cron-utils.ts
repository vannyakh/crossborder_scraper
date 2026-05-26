export type CronCycle = 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'

export type CronCycleState = {
  cycle: CronCycle
  minute: number
  hour: number
  dayOfWeek: number
  dayOfMonth: number
  intervalMinutes: number
  intervalHours: number
  custom: string
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function defaultCronCycleState(): CronCycleState {
  return {
    cycle: 'daily',
    minute: 30,
    hour: 1,
    dayOfWeek: 1,
    dayOfMonth: 1,
    intervalMinutes: 30,
    intervalHours: 6,
    custom: '0 9 * * *',
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.floor(n)))
}

export function buildCronFromCycle(state: CronCycleState): string {
  const minute = clamp(state.minute, 0, 59)
  const hour = clamp(state.hour, 0, 23)
  const dow = clamp(state.dayOfWeek, 0, 6)
  const dom = clamp(state.dayOfMonth, 1, 28)

  switch (state.cycle) {
    case 'minute':
      return `*/${clamp(state.intervalMinutes, 1, 59)} * * * *`
    case 'hourly':
      return `${minute} */${clamp(state.intervalHours, 1, 23)} * * *`
    case 'daily':
      return `${minute} ${hour} * * *`
    case 'weekly':
      return `${minute} ${hour} * * ${dow}`
    case 'monthly':
      return `${minute} ${hour} ${dom} * *`
    case 'custom':
      return state.custom.trim() || '0 9 * * *'
    default:
      return `${minute} ${hour} * * *`
  }
}

export function describeCronCycle(state: CronCycleState): string {
  const m = clamp(state.minute, 0, 59)
  const h = clamp(state.hour, 0, 23)
  const pad = (n: number) => String(n).padStart(2, '0')

  switch (state.cycle) {
    case 'minute':
      return `Every ${clamp(state.intervalMinutes, 1, 59)} minute(s)`
    case 'hourly':
      return `Every ${clamp(state.intervalHours, 1, 23)} hour(s) at :${pad(m)}`
    case 'daily':
      return `Every day at ${pad(h)}:${pad(m)}`
    case 'weekly':
      return `Every ${WEEKDAYS[clamp(state.dayOfWeek, 0, 6)]} at ${pad(h)}:${pad(m)}`
    case 'monthly':
      return `Day ${clamp(state.dayOfMonth, 1, 28)} of each month at ${pad(h)}:${pad(m)}`
    case 'custom':
      return state.custom.trim() || 'Custom expression'
    default:
      return ''
  }
}

/** Best-effort map stored cron → cycle builder (falls back to custom). */
export function parseCronToCycle(cron: string): CronCycleState {
  const base = defaultCronCycleState()
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) {
    return { ...base, cycle: 'custom', custom: cron }
  }

  const [min, hour, dom, , dow] = parts

  const everyMin = min.startsWith('*/')
  if (everyMin && hour === '*' && dom === '*' && dow === '*') {
    return {
      ...base,
      cycle: 'minute',
      intervalMinutes: Number(min.slice(2)) || 30,
    }
  }

  const everyHour = hour.startsWith('*/')
  if (!everyMin && everyHour && dom === '*' && dow === '*') {
    return {
      ...base,
      cycle: 'hourly',
      minute: Number(min) || 0,
      intervalHours: Number(hour.slice(2)) || 6,
    }
  }

  if (!min.includes('*') && !hour.includes('*') && dom === '*' && dow === '*') {
    return {
      ...base,
      cycle: 'daily',
      minute: Number(min) || 0,
      hour: Number(hour) || 9,
    }
  }

  if (!min.includes('*') && !hour.includes('*') && dom === '*' && dow !== '*') {
    return {
      ...base,
      cycle: 'weekly',
      minute: Number(min) || 0,
      hour: Number(hour) || 9,
      dayOfWeek: Number(dow) || 1,
    }
  }

  if (!min.includes('*') && !hour.includes('*') && dom !== '*' && dow === '*') {
    return {
      ...base,
      cycle: 'monthly',
      minute: Number(min) || 0,
      hour: Number(hour) || 9,
      dayOfMonth: Number(dom) || 1,
    }
  }

  return { ...base, cycle: 'custom', custom: cron }
}

export function describeCronExpression(cron: string): string {
  return describeCronCycle(parseCronToCycle(cron))
}

export function formatScheduleTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch {
    return iso
  }
}
