import { BarChart, GaugeChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

let registered = false

export function ensureEchartsRegistered() {
  if (registered) return
  echarts.use([
    GaugeChart,
    LineChart,
    BarChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
    CanvasRenderer,
  ])
  registered = true
}

export { echarts }
