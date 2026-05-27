/** LLM provider presets — mirrors backend `config/llm_providers.py`. */

export type LlmProviderId = 'openai' | 'anthropic' | 'google' | 'ollama' | 'qwen' | 'custom'

export type LlmProviderPreset = {
  id: LlmProviderId
  label: string
  base_url: string
  default_model: string
  api_style: 'openai_compatible' | 'anthropic'
  requires_api_key: boolean
  api_key_hint: string
  docs_url?: string
}

export const LLM_PROVIDER_PRESETS: LlmProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    base_url: 'https://api.openai.com/v1',
    default_model: 'gpt-4o-mini',
    api_style: 'openai_compatible',
    requires_api_key: true,
    api_key_hint: 'sk-…',
    docs_url: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    base_url: 'https://api.anthropic.com',
    default_model: 'claude-3-5-haiku-20241022',
    api_style: 'anthropic',
    requires_api_key: true,
    api_key_hint: 'sk-ant-…',
    docs_url: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'google',
    label: 'Google Gemini',
    base_url: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    default_model: 'gemini-2.0-flash',
    api_style: 'openai_compatible',
    requires_api_key: true,
    api_key_hint: 'AIza…',
    docs_url: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    base_url: 'http://127.0.0.1:11434/v1',
    default_model: 'llama3.2',
    api_style: 'openai_compatible',
    requires_api_key: false,
    api_key_hint: 'Usually not required',
    docs_url: 'https://ollama.com',
  },
  {
    id: 'qwen',
    label: 'Alibaba Qwen (DashScope)',
    base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    default_model: 'qwen-plus',
    api_style: 'openai_compatible',
    requires_api_key: true,
    api_key_hint: 'sk-… (DashScope)',
    docs_url: 'https://dashscope.console.aliyun.com/',
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    base_url: '',
    default_model: '',
    api_style: 'openai_compatible',
    requires_api_key: false,
    api_key_hint: 'Depends on endpoint',
  },
]

export function getLlmProvider(id: string | undefined): LlmProviderPreset {
  return LLM_PROVIDER_PRESETS.find((p) => p.id === id) ?? LLM_PROVIDER_PRESETS[0]
}
