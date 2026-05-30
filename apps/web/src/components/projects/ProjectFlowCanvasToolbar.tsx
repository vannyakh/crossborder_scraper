import {
  GitBranch,
  LayoutGrid,
  Layers,
  Maximize2,
  Minus,
  Network,
  Plus,
  Redo2,
  RotateCcw,
  StickyNote,
  Terminal,
  Undo2,
  Workflow,
} from 'lucide-react'
import { useCallback } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { notifySuccess } from '../../lib/toast'
import type { ProjectFlowCanvasOptions } from './project-flow-canvas-options'
import {
  FlowCanvasFlyout,
  FlowCanvasFlyoutOption,
  FlowCanvasToolbarActionGroup,
  FlowCanvasToolbarMenuAnchor,
  FlowCanvasToolbarShell,
  type FlowCanvasMenuId,
} from './project-flow-canvas-toolbar-ui'

export type { FlowCanvasMenuId }

type ToolbarProps = {
  openMenu: FlowCanvasMenuId
  options: ProjectFlowCanvasOptions
  onOpenMenu: (menu: FlowCanvasMenuId) => void
  onOptionsChange: (patch: Partial<ProjectFlowCanvasOptions>) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onAutoLayout: () => void
  onResetCanvas: () => void
  onAddStickyNote: () => void
  consoleOpen?: boolean
  consoleExpanded?: boolean
  consoleLineCount?: number
  onToggleConsole?: () => void
}

export function ProjectFlowCanvasToolbar({
  openMenu,
  options,
  onOpenMenu,
  onOptionsChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAutoLayout,
  onResetCanvas,
  onAddStickyNote,
  onToggleConsole,
  consoleOpen = false,
  consoleExpanded = true,
  consoleLineCount = 0,
}: ToolbarProps) {
  const { t } = useLocale()

  const toggleMenu = useCallback(
    (menu: FlowCanvasMenuId) => {
      onOpenMenu(openMenu === menu ? null : menu)
    },
    [openMenu, onOpenMenu],
  )

  const closeMenu = useCallback(() => onOpenMenu(null), [onOpenMenu])

  const runLayoutAction = useCallback(
    (action: () => void) => {
      action()
      closeMenu()
    },
    [closeMenu],
  )

  return (
    <FlowCanvasToolbarShell openMenu={openMenu} onCloseMenu={closeMenu}>
      <FlowCanvasToolbarMenuAnchor
        menuId="layout"
        openMenu={openMenu}
        label={t('projects.canvas.layoutMenu')}
        icon={LayoutGrid}
        onToggle={toggleMenu}
      >
        <FlowCanvasFlyout title={t('projects.canvas.layoutTitle')}>
          <FlowCanvasFlyoutOption
            icon={Workflow}
            title={t('projects.canvas.hideConnections')}
            subtitle={t('projects.canvas.hideConnectionsHint')}
            active={options.hideConnections}
            onClick={() => onOptionsChange({ hideConnections: !options.hideConnections })}
          />
          <FlowCanvasFlyoutOption
            icon={LayoutGrid}
            title={t('projects.canvas.autoLayout')}
            subtitle={t('projects.canvas.autoLayoutHint')}
            onClick={() => runLayoutAction(onAutoLayout)}
          />
          <FlowCanvasFlyoutOption
            icon={RotateCcw}
            title={t('projects.canvas.resetCanvas')}
            subtitle={t('projects.canvas.resetCanvasHint')}
            onClick={() => runLayoutAction(onResetCanvas)}
          />
        </FlowCanvasFlyout>
      </FlowCanvasToolbarMenuAnchor>

      <FlowCanvasToolbarActionGroup
        items={[
          { key: 'zoom-in', label: t('projects.zoomIn'), icon: Plus, onClick: onZoomIn },
          { key: 'zoom-out', label: t('projects.zoomOut'), icon: Minus, onClick: onZoomOut },
          { key: 'fit', label: t('projects.fitCanvas'), icon: Maximize2, onClick: onFitView },
        ]}
      />

      <FlowCanvasToolbarActionGroup
        items={[
          {
            key: 'undo',
            label: t('projects.canvas.undo'),
            icon: Undo2,
            onClick: () => notifySuccess(t('projects.canvas.undoPreview')),
          },
          {
            key: 'redo',
            label: t('projects.canvas.redo'),
            icon: Redo2,
            onClick: () => notifySuccess(t('projects.canvas.redoPreview')),
          },
        ]}
      />

      <FlowCanvasToolbarActionGroup
        items={[
          {
            key: 'sticky',
            label: t('projects.sticky.add'),
            icon: StickyNote,
            onClick: onAddStickyNote,
          },
        ]}
      />

      <FlowCanvasToolbarActionGroup
        items={[
          {
            key: 'console',
            label: !consoleOpen
              ? t('projects.flowConsole.open')
              : consoleExpanded
                ? t('projects.flowConsole.minimize')
                : t('projects.flowConsole.expand'),
            icon: Terminal,
            active: consoleOpen,
            badge: consoleOpen ? undefined : consoleLineCount > 0 ? consoleLineCount : undefined,
            onClick: () => onToggleConsole?.(),
          },
        ]}
      />

      <FlowCanvasToolbarMenuAnchor
        menuId="display"
        openMenu={openMenu}
        label={t('projects.canvas.displayMenu')}
        icon={Layers}
        onToggle={toggleMenu}
        flyoutAlign="end"
      >
        <FlowCanvasFlyout title={t('projects.canvas.displayTitle')}>
          <FlowCanvasFlyoutOption
            icon={Network}
            title={t('projects.canvas.networkTraffic')}
            subtitle={t('projects.canvas.networkTrafficHint')}
            active={options.showNetworkTraffic}
            onClick={() => onOptionsChange({ showNetworkTraffic: !options.showNetworkTraffic })}
          />
          <FlowCanvasFlyoutOption
            icon={GitBranch}
            title={t('projects.canvas.variableRefs')}
            subtitle={t('projects.canvas.variableRefsHint')}
            active={options.showVariableRefs}
            onClick={() => onOptionsChange({ showVariableRefs: !options.showVariableRefs })}
          />
        </FlowCanvasFlyout>
      </FlowCanvasToolbarMenuAnchor>
    </FlowCanvasToolbarShell>
  )
}
