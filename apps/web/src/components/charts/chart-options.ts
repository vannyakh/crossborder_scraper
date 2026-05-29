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
    legendPosition = 'top',
    formatY,
    fillArea = true,
    smooth = 0.35,
    lineWidth = 2,
    showSymbols,
    variant = 'default',
    dataZoom = false,
  }: {
    labels: string[]
    series: { name: string; data: number[]; color: string }[]
    yMax?: number
    showLegend?: boolean
    legendPosition?: 'top' | 'bottom'
    formatY?: (value: number) => string
    fillArea?: boolean
    smooth?: number
    lineWidth?: number
    showSymbols?: boolean
    variant?: 'default' | 'compact' | 'expanded'
    dataZoom?: boolean
  },
): EChartsOption {
  const labelStep = labels.length > 18 ? Math.ceil(labels.length / 8) : labels.length > 10 ? 2 : 1
  const legendBottom = showLegend && legendPosition === 'bottom'
  const expanded = variant === 'expanded'
  const compact = variant === 'compact'
  const symbolVisible = showSymbols ?? labels.length <= 24
  const zoomBottom = dataZoom ? 52 : legendBottom ? 36 : compact ? 4 : 8

  return {
    backgroundColor: 'transparent',
    animation: true,
    grid: {
      left: expanded ? 12 : compact ? 4 : 8,
      right: expanded ? 24 : 16,
      top: showLegend && !legendBottom ? (expanded ? 36 : 28) : expanded ? 20 : 12,
      bottom: zoomBottom,
      containLabel: true,
    },
    dataZoom: dataZoom
      ? [
          { type: 'inside', throttle: 50 },
          {
            type: 'slider',
            height: 18,
            bottom: 8,
            borderColor: theme.grid,
            backgroundColor: 'transparent',
            fillerColor: `${theme.accent}33`,
            handleStyle: { color: theme.accent, borderColor: theme.accent },
            textStyle: { color: theme.muted, fontSize: 10 },
          },
        ]
      : undefined,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--flyout-bg)',
      borderColor: theme.grid,
      textStyle: { color: theme.text, fontSize: 12 },
    },
    legend: showLegend
      ? {
          ...(legendBottom ? { bottom: 0, left: 'center' } : { top: 0 }),
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
      axisLabel: {
        color: theme.muted,
        fontSize: 10,
        formatter: formatY ? (value: number) => formatY(Number(value)) : undefined,
      },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth,
      showSymbol: symbolVisible,
      symbolSize: expanded ? 7 : 6,
      lineStyle: { width: lineWidth, color: s.color },
      itemStyle: { color: s.color },
      emphasis: {
        focus: 'series',
        lineStyle: { width: lineWidth + 1 },
      },
      areaStyle: fillArea
        ? {
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
          }
        : undefined,
      data: s.data,
    })),
  }
}

export { logHistogramOption } from '../projects/project-logs-chart'
