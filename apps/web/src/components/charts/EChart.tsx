import { Box } from '@chakra-ui/react'
import type { EChartsOption } from 'echarts'
import { useEffect, useRef } from 'react'
import { useChartTheme } from '../../hooks/use-chart-theme'
import { ensureEchartsRegistered, echarts } from './register-echarts'

type DataZoomEvent = {
  batch?: { start?: number; end?: number; startValue?: number; endValue?: number }[]
  start?: number
  end?: number
  startValue?: number
  endValue?: number
}

export type ChartDataZoomRange = {
  startPercent: number
  endPercent: number
  startIndex: number
  endIndex: number
}

export function EChart({
  option,
  height = '120px',
  className,
  onDataZoom,
}: {
  option: EChartsOption
  height?: string | number
  className?: string
  onDataZoom?: (range: ChartDataZoomRange) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null)
  const theme = useChartTheme()
  const onDataZoomRef = useRef(onDataZoom)
  onDataZoomRef.current = onDataZoom

  useEffect(() => {
    ensureEchartsRegistered()
    const el = ref.current
    if (!el) return

    const chart = echarts.init(el, undefined, { renderer: 'canvas' })
    chartRef.current = chart

    const handleDataZoom = (raw: unknown) => {
      const event = raw as DataZoomEvent
      const batch = event.batch?.[0]
      const startPercent = batch?.start ?? event.start ?? 0
      const endPercent = batch?.end ?? event.end ?? 100
      const startIndex = Math.round(batch?.startValue ?? event.startValue ?? 0)
      const endIndex = Math.round(batch?.endValue ?? event.endValue ?? 0)
      onDataZoomRef.current?.({ startPercent, endPercent, startIndex, endIndex })
    }

    chart.on('datazoom', handleDataZoom)

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(el)

    return () => {
      chart.off('datazoom', handleDataZoom)
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.setOption({ ...option, backgroundColor: 'transparent' }, { notMerge: true })
  }, [option, theme])

  return (
    <Box
      ref={ref}
      className={className}
      w="100%"
      h={height}
      minH={height}
      borderRadius="var(--radius-card)"
    />
  )
}
