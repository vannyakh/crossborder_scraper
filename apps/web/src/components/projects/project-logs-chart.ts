import type { EChartsOption } from 'echarts'
import type { ChartThemeTokens } from '../../theme/chart-theme'

export function logHistogramOption(
  theme: ChartThemeTokens,
  {
    labels,
    info,
    errors,
    withBrush = true,
    brushStart,
    brushEnd,
  }: {
    labels: string[]
    info: number[]
    errors: number[]
    withBrush?: boolean
    brushStart?: number
    brushEnd?: number
  },
): EChartsOption {
  const totals = info.map((value, index) => value + (errors[index] ?? 0))
  const zoomBottom = withBrush ? 46 : 16

  return {
    backgroundColor: 'transparent',
    animation: false,
    grid: { left: 8, right: 12, top: 10, bottom: zoomBottom, containLabel: false },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: theme.grid } },
      backgroundColor: 'var(--flyout-bg)',
      borderColor: theme.grid,
      textStyle: { color: theme.text, fontSize: 11 },
    },
    dataZoom: withBrush
      ? [
          {
            type: 'inside',
            xAxisIndex: 0,
            filterMode: 'none',
            zoomOnMouseWheel: false,
            moveOnMouseMove: true,
            moveOnMouseWheel: true,
          },
          {
            type: 'slider',
            xAxisIndex: 0,
            filterMode: 'none',
            bottom: 6,
            height: 24,
            start: brushStart ?? 0,
            end: brushEnd ?? 100,
            borderColor: theme.grid,
            backgroundColor: 'transparent',
            fillerColor: `${theme.accent}40`,
            handleIcon:
              'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23.1h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
            handleSize: '110%',
            handleStyle: {
              color: theme.accent,
              borderColor: theme.accent,
              shadowBlur: 2,
              shadowColor: `${theme.accent}55`,
            },
            textStyle: { color: theme.muted, fontSize: 10 },
            dataBackground: {
              lineStyle: { color: theme.accent, width: 1.5 },
              areaStyle: { color: `${theme.accent}33` },
            },
            selectedDataBackground: {
              lineStyle: { color: theme.accent, width: 2 },
              areaStyle: { color: `${theme.accent}55` },
            },
          },
        ]
      : undefined,
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { show: false },
      axisLabel: { show: false },
    },
    series: [
      {
        name: 'Info',
        type: 'bar',
        stack: 'logs',
        barMaxWidth: 12,
        itemStyle: { color: `${theme.accent}88`, borderRadius: [2, 2, 0, 0] },
        data: info,
        z: 1,
      },
      {
        name: 'Error',
        type: 'bar',
        stack: 'logs',
        barMaxWidth: 12,
        itemStyle: { color: theme.danger, borderRadius: [2, 2, 0, 0] },
        data: errors,
        z: 1,
      },
      {
        name: 'Volume',
        type: 'line',
        smooth: 0.35,
        showSymbol: false,
        data: totals,
        lineStyle: { width: 2, color: theme.accent },
        itemStyle: { color: theme.accent },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${theme.accent}55` },
              { offset: 1, color: `${theme.accent}08` },
            ],
          },
        },
        z: 2,
      },
    ],
  }
}
