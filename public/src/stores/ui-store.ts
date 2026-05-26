import { create } from 'zustand'

type UiState = {
  selectedBatchId: string | null
  setSelectedBatchId: (id: string | null) => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedBatchId: null,
  setSelectedBatchId: (selectedBatchId) => set({ selectedBatchId }),
}))
