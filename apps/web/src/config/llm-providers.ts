/** LLM provider IDs and model ref helpers — presets come from GET /ai/providers. */

export type LlmProviderId =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'ollama'
  | 'qwen'
  | 'custom'

/** Canonical model ref: `provider/model` (e.g. `openai/gpt-4o-mini`). */
export function formatModelRef(providerId: string, model: string): string {
  const pid = (providerId || 'openai').trim().toLowerCase()
  const mid = (model || '').trim()
  if (!mid) return pid
  return `${pid}/${mid}`
}

export function parseModelRef(ref: string): { providerId: LlmProviderId; model: string } {
  const text = (ref || '').trim()
  if (text.includes('/')) {
    const [providerId, model] = text.split('/', 2)
    return {
      providerId: (providerId.trim().toLowerCase() || 'openai') as LlmProviderId,
      model: model.trim(),
    }
  }
  return { providerId: 'openai', model: text }
}
