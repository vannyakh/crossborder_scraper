export function formatChartTime(t: number): string {
  return new Date(t).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatSamplePeriod(samples: { t: number }[]): string {
  if (samples.length === 0) return 'Collecting…'
  if (samples.length === 1) return 'Live'
  const spanSec = Math.max(1, Math.round((samples[samples.length - 1].t - samples[0].t) / 1000))
  if (spanSec < 60) return `Last ${spanSec}s`
  const mins = Math.round(spanSec / 60)
  return `Last ${mins}m`
}

export function formatPeriodRange(samples: { t: number }[]): string {
  if (samples.length < 2) return '—'
  return `${formatChartTime(samples[0].t)} – ${formatChartTime(samples[samples.length - 1].t)}`
}

export function sampleAverage(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function samplePeak(values: number[]): number {
  if (!values.length) return 0
  return Math.max(...values)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}
