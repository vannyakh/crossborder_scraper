import { create } from 'zustand'

const SIDEBAR_KEY = 'ui.sidebarCollapsed'

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  } catch {
    return false
  }
}

type UiState = {
  selectedBatchId: string | null
  setSelectedBatchId: (id: string | null) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedBatchId: null,
  setSelectedBatchId: (selectedBatchId) => set({ selectedBatchId }),
  sidebarCollapsed: readSidebarCollapsed(),
  toggleSidebar: () =>
    set((state) => {
      const sidebarCollapsed = !state.sidebarCollapsed
      try {
        localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed))
      } catch {
        /* ignore */
      }
      return { sidebarCollapsed }
    }),
  setSidebarCollapsed: (sidebarCollapsed) => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed))
    } catch {
      /* ignore */
    }
    set({ sidebarCollapsed })
  },
}))

export const SIDEBAR_WIDTH_EXPANDED = 216
export const SIDEBAR_WIDTH_COLLAPSED = 64
