import type { EChartsOption } from 'echarts'
import type { ChartThemeTokens } from '../../theme/chart-theme'

export function gaugeOption(
  theme: ChartThemeTokens,
  {
    value,
    color,
  }: {
    value: number
    color?: string
  },
): EChartsOption {
  const v = Math.min(100, Math.max(0, value))
  return {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        radius: '88%',
        pointer: { show: false },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: { color: color ?? theme.accent },
        },
        axisLine: {
          lineStyle: { width: 10, color: [[1, theme.track]] },
        },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 14,
          fontWeight: 700,
          color: theme.text,
          offsetCenter: [0, 0],
          formatter: '{value}%',
        },
        data: [{ value: Math.round(v) }],
      },
    ],
  }
}

export function multiLineOption(
  theme: ChartThemeTokens,
  {
    labels,
    series,
    yMax,
    showLegend = false,
  }: {
    labels: string[]
    series: { name: string; data: number[]; color: string }[]
    yMax?: number
    showLegend?: boolean
  },
): EChartsOption {
  const labelStep = labels.length > 18 ? Math.ceil(labels.length / 8) : labels.length > 10 ? 2 : 1
  return {
    backgroundColor: 'transparent',
    animation: true,
    grid: { left: 4, right: 16, top: showLegend ? 28 : 12, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--flyout-bg)',
      borderColor: theme.grid,
      textStyle: { color: theme.text, fontSize: 12 },
    },
    legend: showLegend
      ? {
          top: 0,
          textStyle: { color: theme.muted, fontSize: 11 },
          itemWidth: 10,
          itemHeight: 10,
        }
      : { show: false },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: theme.grid } },
      axisLabel: {
        color: theme.muted,
        fontSize: 10,
        interval: labelStep - 1,
        hideOverlap: true,
      },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      max: yMax,
      minInterval: yMax ? undefined : 1,
      splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } },
      axisLabel: { color: theme.muted, fontSize: 10 },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth: 0.35,
      showSymbol: s.data.length <= 24,
      symbolSize: 6,
      lineStyle: { width: 2, color: s.color },
      itemStyle: { color: s.color },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: `${s.color}66` },
            { offset: 1, color: `${s.color}06` },
          ],
        },
      },
      data: s.data,
    })),
  }
}
