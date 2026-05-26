import { useEffect, useRef } from 'react'
import { parseUrls } from '../lib/utils'
import { useScrapeStore } from '../stores/scrape-store'
import { useSubmitJobsMutation } from './mutations/use-scrape-mutations'
import { useActiveBatchQuery } from './queries/use-batch-job-query'
import { useConfigQuery } from './queries/use-config-query'
import { useStatsQuery } from './queries/use-stats-query'

export function useDashboard() {
  const urlsText = useScrapeStore((s) => s.urlsText)
  const workers = useScrapeStore((s) => s.workers)
  const useAi = useScrapeStore((s) => s.useAi)
  const save = useScrapeStore((s) => s.save)
  const setUrlsText = useScrapeStore((s) => s.setUrlsText)
  const setWorkers = useScrapeStore((s) => s.setWorkers)
  const setUseAi = useScrapeStore((s) => s.setUseAi)
  const setSave = useScrapeStore((s) => s.setSave)
  const clearActiveBatch = useScrapeStore((s) => s.clearActiveBatch)

  const configQuery = useConfigQuery()
  const statsQuery = useStatsQuery()
  const activeBatch = useActiveBatchQuery()
  const submitMutation = useSubmitJobsMutation()
  const workersInitialized = useRef(false)

  const urls = parseUrls(urlsText)

  useEffect(() => {
    if (configQuery.data?.max_concurrent_jobs && !workersInitialized.current) {
      setWorkers(configQuery.data.max_concurrent_jobs)
      workersInitialized.current = true
    }
  }, [configQuery.data?.max_concurrent_jobs, setWorkers])

  const submit = () =>
    submitMutation.mutateAsync({
      urls,
      workers: Number(workers) || null,
      use_ai: useAi,
      save,
    })

  const clear = () => {
    clearActiveBatch()
    submitMutation.reset()
  }

  const error =
    submitMutation.error ??
    activeBatch.error ??
    configQuery.error ??
    null

  return {
    urlsText,
    workers,
    useAi,
    save,
    urls,
    setUrlsText,
    setWorkers,
    setUseAi,
    setSave,
    config: configQuery.data,
    stats: statsQuery.data,
    apiReady: configQuery.isSuccess,
    batchId: activeBatch.batchId,
    status: activeBatch.status,
    result: activeBatch.result,
    isRunning: activeBatch.isRunning,
    submit,
    clear,
    isSubmitting: submitMutation.isPending,
    error: error ? String((error as Error).message || error) : '',
  }
}
