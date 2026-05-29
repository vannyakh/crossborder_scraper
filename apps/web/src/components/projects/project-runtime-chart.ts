import type { EChartsOption } from 'echarts'
import { multiLineOption } from '../charts/chart-options'
import type { ChartThemeTokens } from '../../theme/chart-theme'
import { formatMetricSnapshot, METRIC_UNIT_KEYS } from './project-observability-utils'
import {
  RUNTIME_METRIC_Y_MAX,
  type ProjectRuntimeMetrics,
  type RuntimeMetricId,
} from './project-runtime-metrics'

export type RuntimeChartDisplay = 'compact' | 'expanded'

export type RuntimeChartPrefs = {
  fillArea: boolean
  autoScale: boolean
}

export const DEFAULT_RUNTIME_CHART_PREFS: RuntimeChartPrefs = {
  fillArea: true,
  autoScale: false,
}

export function defaultFillArea(metric: RuntimeMetricId): boolean {
  return metric !== 'disk'
}

export function buildRuntimeChartOption(
  theme: ChartThemeTokens,
  metric: RuntimeMetricId,
  metrics: ProjectRuntimeMetrics,
  display: RuntimeChartDisplay,
  prefs: RuntimeChartPrefs,
  t: (key: string) => string,
): EChartsOption {
  const seriesData = metrics[metric]
  const expanded = display === 'expanded'
  const unit = t(METRIC_UNIT_KEYS[metric])
  const fillArea = prefs.fillArea && defaultFillArea(metric)
  const yMax = prefs.autoScale ? undefined : RUNTIME_METRIC_Y_MAX[metric]

  const base = multiLineOption(theme, {
    labels: metrics.labels,
    series: seriesData.map((s) => ({
      name: s.name,
      data: s.values,
      color: s.color,
    })),
    yMax,
    showLegend: seriesData.length > 1,
    legendPosition: 'bottom',
    formatY: (v) => formatMetricSnapshot(metric, v),
    fillArea,
    smooth: expanded ? 0.25 : 0.35,
    lineWidth: expanded ? 2.5 : 2,
    showSymbols: expanded,
    variant: expanded ? 'expanded' : 'compact',
    dataZoom: expanded,
  })

  return {
    ...base,
    tooltip: {
      ...(typeof base.tooltip === 'object' ? base.tooltip : {}),
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: { backgroundColor: theme.grid, color: theme.text, fontSize: 11 },
      },
      formatter: (params) => {
        const rows = Array.isArray(params) ? params : [params]
        if (!rows.length) return ''
        const head = rows[0]
        const axisLabel = head && 'axisValue' in head ? String(head.axisValue) : ''
        const lines = rows.map((row) => {
          const value = Array.isArray(row.value) ? row.value[1] : row.value
          const num = Number(value ?? 0)
          return `${row.marker}${row.seriesName}: <b>${formatMetricSnapshot(metric, num)}</b>`
        })
        return [
          `<div style="font-size:11px;margin-bottom:4px;color:${theme.muted}">${axisLabel}</div>`,
          ...lines,
          `<div style="font-size:10px;margin-top:4px;color:${theme.muted}">${unit}</div>`,
        ].join('<br/>')
      },
    },
  }
}
