import type { AppLocale, MessageTree, TranslateFn } from './types'
import { messages } from './messages/index.ts'

function resolvePath(tree: MessageTree, key: string): string | undefined {
  if (!key) return undefined
  const value = key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in node) {
      return (node as MessageTree)[part]
    }
    return undefined
  }, tree)

  return typeof value === 'string' ? value : undefined
}

export function createTranslator(locale: AppLocale): TranslateFn {
  const tree = messages[locale]

  return (key, vars) => {
    if (!key) return ''
    const template = resolvePath(tree, key) ?? resolvePath(messages.en, key) ?? key
    if (!vars) return template

    return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
      const value = vars[name]
      return value === undefined ? '' : String(value)
    })
  }
}
