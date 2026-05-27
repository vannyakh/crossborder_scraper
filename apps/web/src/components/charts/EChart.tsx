import { Box } from '@chakra-ui/react'
import type { EChartsOption } from 'echarts'
import { useEffect, useRef } from 'react'
import { useChartTheme } from '../../hooks/use-chart-theme'
import { ensureEchartsRegistered, echarts } from './register-echarts'

export function EChart({
  option,
  height = '120px',
  className,
}: {
  option: EChartsOption
  height?: string | number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null)
  const theme = useChartTheme()

  useEffect(() => {
    ensureEchartsRegistered()
    const el = ref.current
    if (!el) return

    const chart = echarts.init(el, undefined, { renderer: 'canvas' })
    chartRef.current = chart

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(el)

    return () => {
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
