import { useEffect, useState } from 'react'
import type { HardwareMonitor } from '../../lib/api'

export type HardwareSample = {
  t: number
  cpu: number
  memory: number
  disk: number
}

const MAX_SAMPLES = 36

export function useHardwareSamples(hardware: HardwareMonitor | undefined) {
  const [samples, setSamples] = useState<HardwareSample[]>([])

  useEffect(() => {
    if (!hardware) return
    setSamples((prev) => {
      const point: HardwareSample = {
        t: Date.now(),
        cpu: hardware.cpu.percent,
        memory: hardware.memory.percent,
        disk: hardware.disk.percent,
      }
      const last = prev[prev.length - 1]
      if (
        last &&
        last.cpu === point.cpu &&
        last.memory === point.memory &&
        last.disk === point.disk &&
        point.t - last.t < 4000
      ) {
        return prev
      }
      return [...prev, point].slice(-MAX_SAMPLES)
    })
  }, [
    hardware?.cpu.percent,
    hardware?.memory.percent,
    hardware?.disk.percent,
    hardware?.collected_at,
  ])

  return samples
}
