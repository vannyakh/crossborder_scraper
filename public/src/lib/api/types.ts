export type Config = {
  max_concurrent_jobs: number
  scrape_default_workers?: number
  proxy_list_path: string | null
  proxy_rotation_strategy: string
  ai_enabled: boolean
  ai_fallback: boolean
  ai_agent_enabled?: boolean
  ai_model: string
  cookies_dir: string
  output_dir: string
  db_path: string
  headless?: boolean
  price_markup_percent?: number
  ui_config_path?: string
  secrets_from_env?: boolean
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

export type AIConfig = {
  ai_enabled: boolean
  ai_fallback: boolean
  ai_agent_enabled: boolean
  ai_model: string
  ai_base_url: string
  ai_max_html_chars: number
  ai_timeout_seconds: number
  ai_api_key_set: boolean
  ai_api_key_masked: string | null
  ui_config_path: string
  secrets_from_env: boolean
}

export type AIConfigUpdate = {
  ai_enabled?: boolean
  ai_fallback?: boolean
  ai_agent_enabled?: boolean
  ai_model?: string
  ai_max_html_chars?: number
  ai_timeout_seconds?: number
}

export type MarketplaceEntry = {
  label: string
  enabled: boolean
  credentials: Record<string, string | null>
  supports_export?: boolean
}

export type PanelConfig = {
  ai_enabled: boolean
  ai_fallback: boolean
  ai_agent_enabled: boolean
  ai_model: string
  ai_max_html_chars: number
  ai_timeout_seconds: number
  price_markup_percent: number
  default_currency: string
  scrape_default_workers: number
  headless: boolean
  browser_timeout_ms: number
  request_delay_seconds: number
  proxy_list_path: string | null
  proxy_rotation_strategy: string
  max_concurrent_jobs: number
  ai_base_url: string
  ai_api_key_set: boolean
  ai_api_key_masked: string | null
  proxy_server_set?: boolean
  proxy_server_masked?: string | null
  marketplaces: Record<string, MarketplaceEntry>
  ui_config_path: string
  config_dir: string
  secrets_from_env: boolean
  secrets_from_panel_config?: boolean
}

export type PanelConfigUpdate = {
  ai_enabled?: boolean
  ai_fallback?: boolean
  ai_agent_enabled?: boolean
  ai_model?: string
  ai_max_html_chars?: number
  ai_timeout_seconds?: number
  price_markup_percent?: number
  default_currency?: string
  scrape_default_workers?: number
  headless?: boolean
  browser_timeout_ms?: number
  request_delay_seconds?: number
  proxy_list_path?: string | null
  proxy_rotation_strategy?: string
  max_concurrent_jobs?: number
  proxy_server?: string | null
  ai_api_key?: string | null
  ai_base_url?: string | null
  marketplaces?: Record<
    string,
    {
      label?: string
      enabled?: boolean
      credentials?: Record<string, string | null>
    }
  >
}

export type LLMHealth = {
  ok: boolean
  status: string
  message: string
  model: string
  base_url: string
  models_count?: number | null
  model_available?: boolean | null
  probe?: string | null
}

export type RuntimeBatchInfo = {
  batch_id: string
  status: string
  completed: number
  total: number
  success: number
  failed: number
  running: boolean
}

export type RuntimeStatus = {
  service: string
  version: string
  started_at: string
  uptime_seconds: number
  running_batches: RuntimeBatchInfo[]
  active_tasks: number
  ai: AIConfig
  engine: {
    max_concurrent_jobs: number
    headless: boolean
    proxy_count: number
    browser_mode: string
  }
  storage: {
    products: number
    batches: number
    output_files: number
    db_path: string
    output_dir: string
  }
  cookies_sessions: Record<string, string[]>
}

export type MarketplaceInfo = {
  id: string
  label: string
  configured: boolean
  supports_export?: boolean
}

export type GatewayAgentResponse = {
  ok: boolean
  message: string
  tool_calls: GatewayToolCall[]
  model?: string | null
  prompt_id?: string | null
}

export type GatewayToolCall = {
  name: string
  arguments: Record<string, unknown>
  outcome: { ok?: boolean; tool?: string; result?: unknown; error?: string }
}

export type GatewayPrompt = {
  id: string
  label: string
  path: string
  recommended: boolean
}

export type AgentSchedule = {
  id: string
  name: string
  enabled: boolean
  cron: string
  prompt_id: string
  message: string
  next_run_at?: string | null
  last_run_at?: string | null
  last_status?: string | null
  last_error?: string | null
}

export type AgentScheduleCreate = {
  name: string
  enabled?: boolean
  cron: string
  prompt_id?: string
  message: string
}

export type AgentRunRecord = {
  id: string
  schedule_id?: string | null
  schedule_name?: string | null
  trigger?: string | null
  prompt_id?: string | null
  message?: string | null
  status?: string | null
  ok?: boolean | null
  response?: string | null
  error?: string | null
  tool_calls?: GatewayToolCall[]
  started_at?: string | null
  finished_at?: string | null
}

export type ExportPayload = {
  product_id?: number
  url?: string
  marketplace: string
  dry_run: boolean
}

export type ExportResult = {
  marketplace: string
  dry_run: boolean
  listing: Record<string, unknown>
  published: boolean
  api_response?: Record<string, unknown> | null
}
