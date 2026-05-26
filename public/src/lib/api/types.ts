export type Config = {
  max_concurrent_jobs: number
  proxy_list_path: string | null
  proxy_rotation_strategy: string
  ai_enabled: boolean
  ai_fallback: boolean
  ai_model: string
  cookies_dir: string
  output_dir: string
  db_path: string
  headless?: boolean
  price_markup_percent?: number
}

export type Stats = {
  products: number
  batches: number
  output_files: number
  running_batches: number
  cookies_sessions: Record<string, string[]>
}

export type BatchStatus = {
  started_at: string
  running: boolean
  completed: number
  total: number
  success: number
  failed: number
  status?: string
}

export type JobResult = {
  job_id: string
  url: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
  error?: string | null
  duration_seconds?: number
  proxy_used?: string | null
  ai_used?: boolean
  product_id?: number | null
  product?: { title?: string | null } | null
}

export type BatchReport = {
  batch_id: string
  total: number
  success: number
  failed: number
  results: JobResult[]
  status?: string
  started_at?: string
  finished_at?: string | null
}

export type BatchSummary = {
  batch_id: string
  status: string
  total: number
  completed: number
  success: number
  failed: number
  workers: number | null
  use_ai: boolean
  save_results: boolean
  started_at: string
  finished_at: string | null
}

export type ProductSummary = {
  id: number
  source: string
  source_product_id: string
  source_url: string
  title: string
  created_at: string
  updated_at: string
}

export type FileEntry = {
  path: string
  name: string
  size_bytes: number
  modified_at: string
  kind: string
}

export type SubmitJobsPayload = {
  urls: string[]
  workers: number | null
  use_ai: boolean
  save: boolean
}
