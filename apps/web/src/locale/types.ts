export type AppLocale = 'en' | 'zh' | 'km'

export type MessageTree = {
  [key: string]: string | MessageTree
}

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string
