import type { DbCharsetOption } from '../types'

export const PLATFORM_ID = 'mysql' as const
export const PRODUCT_LABEL = 'MySQL'

export const CHARSET_OPTIONS: DbCharsetOption[] = [
  { value: 'utf8mb4', label: 'utf8mb4' },
  { value: 'utf-8', label: 'utf-8' },
  { value: 'gbk', label: 'gbk' },
  { value: 'big5', label: 'big5' },
  { value: 'latin1', label: 'latin1' },
]

export const DEFAULT_CHARSET = CHARSET_OPTIONS[0].value
