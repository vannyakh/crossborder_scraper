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
  }: {
    labels: string[]
    series: { name: string; data: number[]; color: string }[]
  },
): EChartsOption {
  return {
    backgroundColor: 'transparent',
    animation: true,
    grid: { left: 8, right: 12, top: 28, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--flyout-bg)',
      borderColor: theme.grid,
      textStyle: { color: theme.text, fontSize: 12 },
    },
    legend: {
      top: 0,
      textStyle: { color: theme.muted, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: theme.grid } },
      axisLabel: { color: theme.muted, fontSize: 10, show: labels.length <= 12 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } },
      axisLabel: { color: theme.muted, fontSize: 10 },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      showSymbol: false,
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
            { offset: 0, color: `${s.color}55` },
            { offset: 1, color: `${s.color}08` },
          ],
        },
      },
      data: s.data,
    })),
  }
}
