/** Canvas display + layout options for the project flow editor (session preview). */

export type ProjectFlowCanvasOptions = {
  /** Dashed config / service traffic edges */
  showNetworkTraffic: boolean
  /** Port labels under the gateway agent */
  showVariableRefs: boolean
  /** Hide all connection lines */
  hideConnections: boolean
}

export const DEFAULT_FLOW_CANVAS_OPTIONS: ProjectFlowCanvasOptions = {
  showNetworkTraffic: true,
  showVariableRefs: true,
  hideConnections: false,
}
