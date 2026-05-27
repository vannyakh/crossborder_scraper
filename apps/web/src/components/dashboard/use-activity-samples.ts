import { useEffect, useState } from 'react'
import type { RuntimeStatus } from '../../lib/api'

export type ActivitySample = {
  t: number
  active: number
  running: number
}

const MAX_SAMPLES = 72
const MIN_SAMPLE_GAP_MS = 2500

export function useActivitySamples(runtime: RuntimeStatus | undefined) {
  const [samples, setSamples] = useState<ActivitySample[]>([])

  useEffect(() => {
    if (!runtime) return
    setSamples((prev) => {
      const point: ActivitySample = {
        t: Date.now(),
        active: runtime.active_tasks,
        running: runtime.running_batches.length,
      }
      const last = prev[prev.length - 1]
      if (
        last &&
        last.active === point.active &&
        last.running === point.running &&
        point.t - last.t < MIN_SAMPLE_GAP_MS
      ) {
        return prev
      }
      return [...prev, point].slice(-MAX_SAMPLES)
    })
  }, [runtime?.active_tasks, runtime?.running_batches.length, runtime?.uptime_seconds])

  return samples
}
