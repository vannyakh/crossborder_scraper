import { create } from 'zustand'

const DEFAULT_URLS = `https://detail.1688.com/offer/XXXXXXXX.html
https://www.aliexpress.com/item/YYYYYYYY.html`

type ScrapeState = {
  urlsText: string
  workers: number
  useAi: boolean
  save: boolean
  activeBatchId: string
  setUrlsText: (urlsText: string) => void
  setWorkers: (workers: number) => void
  setUseAi: (useAi: boolean) => void
  setSave: (save: boolean) => void
  setActiveBatchId: (batchId: string) => void
  clearActiveBatch: () => void
  resetForm: () => void
}

export const useScrapeStore = create<ScrapeState>((set) => ({
  urlsText: DEFAULT_URLS,
  workers: 3,
  useAi: false,
  save: true,
  activeBatchId: '',
  setUrlsText: (urlsText) => set({ urlsText }),
  setWorkers: (workers) => set({ workers }),
  setUseAi: (useAi) => set({ useAi }),
  setSave: (save) => set({ save }),
  setActiveBatchId: (activeBatchId) => set({ activeBatchId }),
  clearActiveBatch: () => set({ activeBatchId: '' }),
  resetForm: () =>
    set({
      urlsText: DEFAULT_URLS,
      workers: 3,
      useAi: false,
      save: true,
    }),
}))
