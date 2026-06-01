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

export type LlmProviderId =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'ollama'
  | 'qwen'
  | 'custom'

export type LlmProviderInfo = {
  id: LlmProviderId
  label: string
  base_url: string
  default_model: string
  api_style: string
  requires_api_key: boolean
  api_key_hint: string
  docs_url?: string
}

export type LlmModelItem = {
  id: string
  label?: string | null
}

export type LlmModelsSource = 'api' | 'default' | 'missing_key' | 'ollama_offline' | 'ollama_empty'

export type LlmModelsList = {
  provider: LlmProviderId
  provider_label: string
  models: LlmModelItem[]
  source: LlmModelsSource
  message?: string
}

export type OllamaPullRequest = {
  model: string
  base_url?: string
}

export type OllamaPullResponse = {
  ok: boolean
  model: string
  message: string
}

export type LlmModelsProbe = {
  ai_provider?: LlmProviderId
  ai_base_url?: string
  ai_api_key?: string
  ai_model?: string
}

export type AIConfig = {
  ai_provider?: LlmProviderId
  provider_label?: string
  model_ref?: string
  ai_enabled: boolean
  ai_fallback: boolean
  ai_agent_enabled: boolean
  ai_model: string
  ai_base_url: string
  ai_max_html_chars: number
  ai_timeout_seconds: number
  ai_api_key_set: boolean
  ai_api_key_masked: string | null
  llm_ready?: boolean
  ui_config_path: string
  secrets_from_env: boolean
}

export type AIConfigUpdate = {
  ai_provider?: LlmProviderId
  ai_enabled?: boolean
  ai_fallback?: boolean
  ai_agent_enabled?: boolean
  ai_model?: string
  ai_base_url?: string
  ai_api_key?: string
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
  ai_provider: LlmProviderId
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
  vpn_enabled?: boolean
  vpn_mode?: 'local_socks' | 'wireguard'
  vpn_endpoint_set?: boolean
  vpn_local_endpoint_masked?: string | null
  vpn_config_path?: string | null
  marketplaces: Record<string, MarketplaceEntry>
  ui_config_path: string
  config_dir: string
  secrets_from_env: boolean
  secrets_from_panel_config?: boolean
}

export type PanelConfigUpdate = {
  ai_provider?: LlmProviderId
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
  vpn_enabled?: boolean
  vpn_mode?: 'local_socks' | 'wireguard'
  vpn_local_endpoint?: string | null
  vpn_config_path?: string | null
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
  model_ref?: string | null
  base_url: string
  provider?: string | null
  provider_label?: string | null
  models_count?: number | null
  model_available?: boolean | null
  probe?: string | null
}

export type AgentLlmSetupStep = {
  id: string
  label: string
  detail: string
  ok: boolean
  optional?: boolean
}

export type AgentLlmGatewaySummary = {
  tools_count: number
  skills_count: number
  enabled_skills_count: number
  workflows_count: number
  schedules_count: number
  enabled_schedules_count: number
}

export type AgentLlmSetup = {
  config: AIConfig
  health: LLMHealth | null
  gateway: AgentLlmGatewaySummary
  steps: AgentLlmSetupStep[]
  setup_complete: boolean
  chat_ready: boolean
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

export type HardwareCpuInfo = {
  percent: number
  count_logical: number
  count_physical?: number | null
  model_name?: string
  architecture_summary?: string
  per_core_percent?: number[]
}

export type HardwareMemoryInfo = {
  used_bytes: number
  total_bytes: number
  available_bytes: number
  percent: number
  used_human: string
  total_human: string
  available_human?: string
  swap_percent?: number | null
  swap_used_human?: string | null
  swap_total_human?: string | null
}

export type HardwareDiskInfo = {
  path: string
  used_bytes: number
  total_bytes: number
  free_bytes: number
  percent: number
  used_human: string
  total_human: string
  free_human?: string
}

export type HardwareProcessEntry = {
  pid: number
  name: string
  cpu_percent?: number | null
  memory_percent?: number | null
  rss_human?: string | null
}

export type HardwareLoadInfo = {
  load_1: number
  load_5: number
  load_15: number
  percent: number
}

export type HardwareProcessInfo = {
  rss_bytes: number
  rss_human: string
  threads: number
}

export type HardwareMonitor = {
  collected_at: string
  hostname: string
  platform: string
  python_version: string
  system_label?: string
  system_detail?: string
  host_uptime_seconds?: number
  host_uptime_label?: string
  cpu: HardwareCpuInfo
  memory: HardwareMemoryInfo
  disk: HardwareDiskInfo
  load: HardwareLoadInfo
  process: HardwareProcessInfo
  top_cpu_processes?: HardwareProcessEntry[]
  top_memory_processes?: HardwareProcessEntry[]
}

export type PanelAccess = {
  bind_host: string
  bind_port: number
  access_ip: string
  access_port: number
  panel_path: string
  panel_url: string
  copy_text: string
  entry_path?: string | null
  entrance_url?: string | null
}

export type LogCategory = 'operation' | 'run' | 'cron' | 'runtime'

export type ServiceLogEntry = {
  id: string
  category: LogCategory
  user: string
  operation_type: string
  details: string
  created_at: string
  meta?: Record<string, unknown>
}

export type ServiceLogListResponse = {
  category: LogCategory
  items: ServiceLogEntry[]
  total: number
  limit: number
  offset: number
}

export type ProjectRuntimeServiceSeries = {
  id: string
  name: string
  color: string
  values: number[]
}

export type ProjectRuntimeMetricsBlock = {
  labels: string[]
  cpu: ProjectRuntimeServiceSeries[]
  memory: ProjectRuntimeServiceSeries[]
  network: ProjectRuntimeServiceSeries[]
  disk: ProjectRuntimeServiceSeries[]
}

export type ProjectRuntimeState = {
  services_online: number
  services_total: number
  nodes: number
  flow_revision: number
  host_cpu_percent: number
  host_memory_percent: number
  host_disk_percent: number
  collected_at: string
}

export type ProjectRuntimeRecentLog = {
  id: string
  level: string
  message: string
  node_label?: string | null
  created_at: string
}

export type ProjectRuntimeResponse = {
  project_id: string
  live: boolean
  simulated?: boolean
  state: ProjectRuntimeState
  metrics: ProjectRuntimeMetricsBlock
  recent_logs: ProjectRuntimeRecentLog[]
}

export type ProjectVisibility = 'private' | 'workspace'
export type ProjectVariableScope = 'project' | 'shared'

export type ProjectEnvironment = 'production' | 'staging' | 'development'

export type ProjectSettingsGeneral = {
  name: string
  description: string
  environment: ProjectEnvironment
  visibility: ProjectVisibility
}

export type ProjectSettingsUsage = {
  services_online: number
  services_total: number
  nodes: number
  environment: ProjectEnvironment
  flow_revision: number
  updated_at: string
}

export type ProjectSettingsVariable = {
  key: string
  scope: ProjectVariableScope
  masked: boolean
  value: string
}

export type ProjectSettingsWebhook = {
  node_id: string
  label: string
  subtitle?: string | null
  kind: string
  status: string
}

export type ProjectSettingsMember = {
  id: string
  name: string
  role: string
  username?: string | null
}

export type ProjectSettingsToken = {
  id: string
  label: string
  prefix: string
  created_at: string
}

export type ProjectSettingsIntegration = {
  id: string
  label: string
  linked: boolean
  configured: boolean
  runtime_active: boolean
}

export type ProjectSettingsResponse = {
  project_id: string
  general: ProjectSettingsGeneral
  usage: ProjectSettingsUsage
  variables: ProjectSettingsVariable[]
  webhooks: ProjectSettingsWebhook[]
  members: ProjectSettingsMember[]
  tokens: ProjectSettingsToken[]
  integrations: ProjectSettingsIntegration[]
  tokens_preview?: boolean
}

export type ProjectTokenCreateResponse = {
  token: ProjectSettingsToken
  secret: string
  message: string
}

export type PluginProfileFieldType =
  | 'text'
  | 'textarea'
  | 'mono'
  | 'url'
  | 'select'
  | 'toggle'
  | 'llm_provider'
  | 'llm_model'
  | 'source_plugin'
  | 'variable_key'

export type PluginProfileSelectOption = {
  value: string
  label: string
}

export type PluginProfileField = {
  id: string
  key: string
  label: string
  type: PluginProfileFieldType
  required?: boolean
  default?: string | boolean | number | null
  placeholder?: string | null
  hint?: string | null
  bind?: 'label' | 'subtitle' | 'host' | 'detail' | 'agentPrompt'
  resolve?: 'label' | 'subtitle' | 'host' | 'detail' | 'id' | 'kind' | 'role' | 'status' | 'image'
  rows?: number | null
  options?: PluginProfileSelectOption[]
}

export type PluginProfileSection = {
  id: string
  label: string
  tab: string
  fields: PluginProfileField[]
}

export type PluginProfileTab = {
  id: string
  label: string
}

export type PluginVariableKey = {
  key: string
  label: string
  scope: 'project' | 'shared'
  masked?: boolean
}

export type PluginProfile = {
  id: string
  label: string
  category: 'model' | 'memory' | 'tool' | 'scraper' | 'service'
  plugin_id?: string | null
  node_kinds: string[]
  slot_index?: number | null
  parameters_layout?: 'default' | 'agent-slots' | null
  tabs: PluginProfileTab[]
  sections: PluginProfileSection[]
  variable_keys: PluginVariableKey[]
}

export type PluginProfileCatalogResponse = {
  profiles: PluginProfile[]
  total: number
}

export type MonitorStatus = {
  collected_at: string
  hardware: HardwareMonitor
  service: RuntimeStatus
}

export type PanelUpdateStatus = {
  current_version: string
  latest_version: string | null
  update_available: boolean
  release_url: string | null
  release_notes: string | null
  source: string
  git_commits_behind: number
  git_branch: string | null
  check_error: string | null
}

export type PanelUpdateApply = {
  ok: boolean
  steps: string[]
  warnings: string[]
  runtime: string
  restarting: boolean
  current_version: string
  latest_version: string | null
  update_available: boolean
}

export type GatewayTelegramSummary = {
  enabled: boolean
  configured: boolean
  control_chats: number
  allow_any_chat: boolean
}

export type TelegramChannelConfig = {
  enabled: boolean
  bot_token?: string | null
  bot_token_set: boolean
  bot_token_masked?: string | null
  control_chat_ids: number[]
  allow_any_chat: boolean
  prompt_id: string
  max_reply_chars: number
}

export type TelegramChannelUpdate = {
  enabled?: boolean
  bot_token?: string | null
  control_chat_ids?: number[]
  allow_any_chat?: boolean
  prompt_id?: string
  max_reply_chars?: number
}

export type IntegrateChannelField = {
  key: string
  type: string
  label: string
  placeholder?: string
  helper?: string
}

export type IntegrateChannelSummary = {
  id: string
  label: string
  description: string
  runner: 'live' | 'stored'
  configured: boolean
  enabled: boolean
  runtime_active: boolean
}

export type IntegrateChannelDetail = IntegrateChannelSummary & {
  setup_steps: string[]
  setup_guide_md: string
  setup_guide_path: string
  fields: IntegrateChannelField[]
  config: Record<string, unknown>
}

export type GatewayStatus = {
  service: string
  version: string
  update_available?: boolean
  latest_version?: string | null
  control_plane: string
  clients: string[]
  tools_count: number
  skills_count?: number
  enabled_skills_count?: number
  rules_count?: number
  enabled_rules_count?: number
  workflows_count: number
  schedules_count?: number
  enabled_schedules_count?: number
  recent_failed_runs?: number
  runtime: RuntimeStatus
  telegram?: GatewayTelegramSummary
}

export type GatewayTool = {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export type GatewayWorkflow = {
  id: string
  label: string
  description: string
  inputs: string[]
  steps: string[]
}

export type GatewayWorkflowRunResponse = {
  workflow: string
  status: string
  steps: Record<string, unknown>[]
  context: Record<string, unknown>
}

export type ServiceGatewaySummary = {
  service: string
  version: string
  update_available?: boolean
  latest_version?: string | null
  control_plane: string
  clients: string[]
  tools_count: number
  skills_count?: number
  enabled_skills_count?: number
  rules_count?: number
  enabled_rules_count?: number
  workflows_count: number
  schedules_count: number
  enabled_schedules_count: number
  recent_failed_runs: number
  telegram?: GatewayTelegramSummary
}

export type ServiceOverview = {
  runtime: RuntimeStatus
  gateway: ServiceGatewaySummary
  llm: LLMHealth | null
}

export type PanelGuideCategoryId = 'agent' | 'scrape' | 'panel' | 'integrate'

export type PanelGuideLink = {
  label: string
  path: string
}

export type PanelGuideSummary = {
  id: string
  title: string
  summary: string
  category: PanelGuideCategoryId
  category_label: string
  tool_ids: string[]
  links: PanelGuideLink[]
}

export type PanelGuideDetail = PanelGuideSummary & {
  body_md: string
  source_path: string
}

export type PanelGuideList = {
  items: PanelGuideSummary[]
  categories: { id: string; label: string }[]
}

export type ModuleProfileLink = {
  label: string
  path: string
}

export type ModuleProfileSummary = {
  id: string
  kind: string
  name: string
  category: string
  category_label: string
  icon: string
  summary: string
  tags: string[]
  links: ModuleProfileLink[]
  has_guide: boolean
  source_path: string
}

export type ModuleProfileDetail = ModuleProfileSummary & {
  body_md: string
}

export type ModuleProfileMeta = {
  modules: ModuleProfileSummary[]
  categories: { id: string; label: string; kinds: string[] }[]
  icons: Record<string, string>
  total: number
}

export type ServiceSupportLink = {
  id: string
  label: string
  description: string
  path: string
  external: boolean
}

export type ServiceSupportCheck = {
  id: string
  label: string
  ok: boolean
  detail: string
}

export type ServiceSchedulerTask = {
  id: string
  name: string
  enabled: boolean
  cron: string
  prompt_id: string
  next_run_at?: string | null
  last_run_at?: string | null
  last_status?: string | null
  last_error?: string | null
}

export type ServiceSchedulerStatus = {
  running: boolean
  tick_seconds: number
  schedules_path: string
  total: number
  enabled: number
  failed_last_run: number
  tasks: ServiceSchedulerTask[]
}

export type ServiceSupport = {
  runtime: RuntimeStatus
  gateway: ServiceGatewaySummary
  scheduler: ServiceSchedulerStatus
  stats: Stats
  logs: { operation: number; run: number; cron: number; total: number; path: string }
  paths: {
    schedules: string
    agent_runs: string
    service_logs: string
    db: string
    output: string
    cookies: string
  }
  panel: {
    bind_host: string
    bind_port: number
    access_ip: string
    access_port: number
    panel_path: string
    panel_url: string
    copy_text: string
  }
  checks: ServiceSupportCheck[]
  links: ServiceSupportLink[]
}

export type GatewayAgentResponse = {
  ok: boolean
  message: string
  tool_calls: GatewayToolCall[]
  model?: string | null
  provider?: string | null
  model_ref?: string | null
  prompt_id?: string | null
  session_id?: string | null
  skill_ids?: string[]
  rule_ids?: string[]
  channel_id?: string | null
  platform_chat_id?: string | null
}

export type AgentChatMessage = {
  role: 'user' | 'assistant'
  content: string
  created_at?: string | null
  ok?: boolean | null
  tool_calls?: GatewayToolCall[]
  model_ref?: string | null
  kind?: 'session' | null
}

export type AgentChatSession = {
  id: string
  label: string
  display_label?: string | null
  channel_id: string
  platform_chat_id?: string | null
  platform_chat_title?: string | null
  platform_chat_kind?: 'direct' | 'group' | 'unknown' | null
  message_count?: number
  prompt_id: string
  created_at: string
  updated_at: string
  messages: AgentChatMessage[]
}

export type AgentChatSessionChannelSummary = {
  channel_id: string
  label: string
  count: number
}

export type AgentRule = {
  id: string
  name: string
  description: string
  category: string
  priority: number
  enabled: boolean
  kind: 'builtin' | 'custom'
  path: string
  body_preview: string
}

export type AgentRuleDetail = AgentRule & {
  body: string
}

export type AgentRuleList = {
  items: AgentRule[]
  total: number
  enabled: string[]
}

export type AgentRuleCreate = {
  id: string
  name: string
  description?: string
  category?: 'safety' | 'behavior' | 'tools' | 'output' | 'general'
  body: string
  priority?: number
}

export type GatewaySkill = {
  id: string
  name: string
  description: string
  version: string
  category: string
  emoji: string
  tools: string[]
  homepage: string
  enabled: boolean
  installed: boolean
  kind: 'builtin' | 'installed'
  trusted: boolean
  path: string
  source?: 'builtin' | 'installed' | 'registry'
  registry_slug?: string
  registry_url?: string
  installed_at?: string
  registry_version?: string
  has_guide?: boolean
  guide_summary?: string
  category_label?: string
  icon?: string
  module_kind?: string
}

export type GatewaySkillList = {
  items: GatewaySkill[]
  total: number
  enabled: string[]
}

export type SkillRegistryItem = {
  slug: string
  name: string
  description: string
  version: string
  kind: 'skill' | 'plugin'
  family: string
  owner_handle: string
  downloads: number
  stars: number
  executes_code: boolean
  is_official: boolean
  registry_url: string
  installed: boolean
  enabled: boolean
}

export type SkillRegistryList = {
  items: SkillRegistryItem[]
  next_cursor: string | null
  registry_url: string
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
  kind?: 'role' | 'task'
}

export type AgentSchedule = {
  id: string
  name: string
  enabled: boolean
  cron: string
  prompt_id: string
  message: string
  notify_telegram?: boolean
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
  notify_telegram?: boolean
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

export type StoreConnectionField = {
  key: string
  label: string
  type: 'text' | 'number' | 'password'
  required: boolean
  default?: string | number | null
}

import type { PluginScrapeSpec } from './plugin-spec'

export type StoreCatalogItem = {
  id: string
  kind?: 'service' | 'source' | 'site'
  name: string
  category: string
  description: string
  version: string
  default_port: number
  supports_docker: boolean
  supports_external: boolean
  supports_native?: boolean
  available_versions?: string[]
  default_version?: string
  systemd_unit?: string
  docker_image: string
  tags: string[]
  connection_fields: StoreConnectionField[]
  domains?: string[]
  enabled?: boolean
  installed: boolean
  status: string
  mode: string | null
  trusted?: boolean
  sandboxed?: boolean
  permissions?: Record<string, boolean>
  scrape_spec?: PluginScrapeSpec
  has_guide?: boolean
  guide_summary?: string
  category_label?: string
  icon?: string
  module_kind?: string
}

export type StoreEnvironment = {
  docker_available: boolean
  compose_available: boolean
  native_driver_available?: boolean
  platform?: string
  store_dir: string
  builtin_sqlite: {
    label: string
    path: string
    description: string
  }
}

export type StoreInstallRequest = {
  mode?: 'native' | 'docker'
  port?: number
  version?: string
}

export type StoreInstalled = {
  plugin_id: string
  name: string
  category: string
  mode: string | null
  status: string
  installed_at?: string | null
  updated_at?: string | null
  config: Record<string, unknown>
  probe?: { ok?: boolean; message?: string } | null
  error?: string | null
  container_name?: string | null
}

export type StoreConnectRequest = {
  host?: string
  port?: number
  username?: string
  password?: string
  database?: string
  management_port?: number
}

export type StoreUpdateConfigRequest = {
  host?: string
  port?: number
  username?: string
  password?: string
  database?: string
  management_port?: number
  regenerate_password?: boolean
}

export type StoreDatabaseEntry = {
  name: string
  username: string
  password: string
  charset: string
  access?: string
  created_at?: string | null
  legacy?: boolean
}

export type DatabaseProviderInfo = {
  id: string
  label: string
  category: string
  default_port: number
  supports_docker: boolean
  supports_external: boolean
  supports_native?: boolean
  supports_logical_create: boolean
  supports_managed_connection: boolean
  installed: boolean
  status: string
  mode?: string | null
  default_version?: string | null
  available_versions?: string[]
  host_detected_version?: string | null
}

export type DatabaseInstallVersionOption = {
  id: string
  label: string
  docker_image?: string | null
  native_supported: boolean
  recommended: boolean
}

export type DatabaseInstallOptionsResponse = {
  plugin_id: string
  product: string
  label: string
  description: string
  platform: string
  default_port: number
  default_version: string
  supports_docker: boolean
  supports_native: boolean
  supports_external: boolean
  docker_available: boolean
  native_available: boolean
  host_detected_version?: string | null
  docker_versions: DatabaseInstallVersionOption[]
  native_versions: DatabaseInstallVersionOption[]
}

export type StoreDatabaseConnectionView = {
  host: string
  port?: number | null
  username?: string | null
  database?: string | null
  password_set: boolean
  mode?: string | null
  container_name?: string | null
  status?: string | null
}

export type StoreDatabasePatchRequest = {
  password?: string
  access?: 'local' | 'remote'
  regenerate_password?: boolean
}

export type StoreManagedDatabaseResponse = {
  plugin_id: string
  managed: StoreDatabaseEntry | null
  items: StoreDatabaseEntry[]
  total: number
  connection: StoreDatabaseConnectionView
  supports_create: boolean
  extra_logical_count: number
  supports_optimize: boolean
  supports_permission: boolean
  supports_inspect: boolean
}

export type DatabaseTableInfo = {
  name: string
  engine?: string | null
  row_type: string
  rows?: number | null
  size_bytes?: number | null
  collation?: string | null
}

export type DatabaseQuerySuggestion = {
  label: string
  sql: string
}

export type DatabaseTablesResponse = {
  plugin_id: string
  database: string
  items: DatabaseTableInfo[]
  total: number
  suggestions: DatabaseQuerySuggestion[]
  syntax_hints: string[]
}

export type DatabaseQueryRequest = {
  sql: string
  limit?: number
}

export type DatabaseQueryResponse = {
  ok: boolean
  error?: string | null
  columns: string[]
  rows: string[][]
  row_count: number
  rows_affected?: number | null
  elapsed_ms?: number | null
  message?: string | null
  sql_executed?: string | null
}

export type DatabaseSqlCompleteResponse = {
  keywords: string[]
  types: string[]
  identifiers: string[]
}

export type DatabaseColumnInfo = {
  name: string
  data_type: string
  nullable: boolean
  default?: string | null
  primary?: boolean
}

export type DatabaseColumnsResponse = {
  plugin_id: string
  database: string
  table: string
  items: DatabaseColumnInfo[]
}

export type DatabaseCreateTableColumn = {
  name: string
  type: string
  nullable?: boolean
  primary?: boolean
  auto_increment?: boolean
  default?: string | null
}

export type DatabaseCreateTableRequest = {
  table_name: string
  columns: DatabaseCreateTableColumn[]
}

export type DatabaseAddColumnRequest = {
  column_name: string
  column_type: string
  nullable?: boolean
  default?: string | null
}

export type DatabaseInsertRowRequest = {
  values: Record<string, string | number | boolean | null>
}

export type DatabaseActionResponse = {
  ok: boolean
  message?: string | null
  table?: string | null
}

/** @deprecated Prefer StoreManagedDatabaseResponse */
export type StoreDatabaseListResponse = {
  plugin_id: string
  items: StoreDatabaseEntry[]
  total: number
  supports_create: boolean
}

export type StoreDatabaseCreateItem = {
  name: string
  username?: string
  password?: string
  charset?: string
  access?: 'local' | 'remote'
}

export type StoreCreateDatabasesRequest = {
  databases: StoreDatabaseCreateItem[]
}

export type StorePluginCredentials = {
  plugin_id: string
  mode?: string | null
  host?: string | null
  port?: number | null
  username?: string | null
  database?: string | null
  password?: string | null
  management_port?: number | null
  has_password: boolean
}

export type StoreInstallLog = {
  plugin_id: string
  status: string
  mode?: string | null
  lines: string[]
  tail: number
}

export type StorePluginDetail = StoreCatalogItem & {
  installation?: StoreInstalled | null
}

export type DockerStatus = {
  installed: boolean
  daemon_running: boolean
  service_status: 'running' | 'stopped' | 'not_installed'
  docker_available: boolean
  compose_available: boolean
  hostname: string
  system: string
  architecture: string
  kernel: string
  cpu_cores?: number | null
  memory_gb?: number | null
  docker_version: string
  compose_version: string
  unix_socket: string
  config_path: string
  install_dir: string
  needs_install: boolean
  can_install: boolean
}

export type DockerConfig = {
  registry_mirrors: string[]
  registry_mirror_display: string
  compose_path: string
  install_dir: string
  log_max_size: string
  log_max_file: number
  ipv6: boolean
  iptables: boolean
  live_restore: boolean
}

export type DockerInstallResult = {
  ok: boolean
  already_installed?: boolean
  messages: string[]
  status?: DockerStatus
}

export type DockerServiceResult = {
  ok: boolean
  action?: string
  message: string
  status?: DockerStatus
}

export type DockerContainer = {
  id: string
  name: string
  image: string
  status: string
  ports: string
  running: boolean
  created: string
}

export type DockerContainerList = {
  items: DockerContainer[]
  total: number
  error?: string | null
}

export type DockerHubItem = {
  name: string
  image: string
  description: string
  stars?: number
  pulls?: number
  official?: boolean
}

export type DockerHubList = {
  items: DockerHubItem[]
  total: number
  query?: string | null
  error?: string | null
}

export type DockerRunResult = {
  ok: boolean
  container_id?: string
  container_name?: string
  image?: string
  message: string
}

export type FirewallStatus = {
  installed: boolean
  active: boolean
  can_manage: boolean
  port_allowed: boolean
  ssh_allowed: boolean
  summary: string
  port_rule_count: number
  inbound_rule_count: number
  outbound_rule_count: number
  ip_rule_count: number
  forward_rule_count: number
  area_rule_count: number
  group_count: number
  block_icmp: boolean
  icmp_blocked: boolean
  config_path: string
  platform: string
}

export type FirewallRule = {
  id: string
  ufw_number: number
  protocol: string
  port: string
  source: string
  action: string
  strategy: string
  direction: 'inbound' | 'outbound'
  remark: string
  group_id?: string | null
  group_label?: string | null
  listening?: boolean | null
  status_label: string
  managed: boolean
  ipv6: boolean
}

export type FirewallRuleList = {
  items: FirewallRule[]
  total: number
}

export type FirewallRuleCreate = {
  protocol: 'tcp' | 'udp' | 'any'
  port: string
  source?: string
  action?: 'allow' | 'deny'
  direction?: 'inbound' | 'outbound'
  remark?: string
  group_id?: string | null
}

export type FirewallGroup = {
  id: string
  label: string
  description: string
  rule_count?: number
}

export type FirewallGroupList = {
  items: FirewallGroup[]
  total: number
}

export type FirewallActionResult = {
  ok: boolean
  message?: string
  messages?: string[]
}

export type FirewallExport = {
  version: number
  block_icmp?: boolean
  groups?: FirewallGroup[]
  rules_meta?: Record<string, unknown>
  live_rules?: FirewallRule[]
}

export type VhostStatus = {
  installed: boolean
  can_manage: boolean
  certbot_installed: boolean
  sites_available_dir: string
  sites_enabled_dir: string
  site_count: number
  enabled_count: number
  ssl_count: number
  unhealthy_count: number
  panel_port: number
  panel_upstream_healthy: boolean | null
  config_path: string
  platform: string
}

export type VhostSite = {
  id: string
  filename: string
  config_path: string
  server_names: string[]
  listen_ports: string[]
  upstream_port: number | null
  upstream_healthy: boolean | null
  ssl: boolean
  enabled: boolean
  managed: boolean
  remark: string
  purpose: 'panel' | 'proxy' | 'other'
}

export type VhostSiteList = {
  items: VhostSite[]
  total: number
}

export type VhostSiteCreate = {
  domain: string
  upstream_port?: number
  ssl?: boolean
  certbot?: boolean
  remark?: string
  purpose?: 'panel' | 'proxy' | 'other'
}

export type VhostActionResult = {
  ok: boolean
  message?: string
  messages?: string[]
  warnings?: string[]
  login_url?: string | null
  status?: VhostStatus
  sites?: VhostSiteList
}
