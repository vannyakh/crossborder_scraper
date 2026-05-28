import type { DbCharsetOption } from '../types'

export const PLATFORM_ID = 'postgresql' as const
export const PRODUCT_LABEL = 'PostgreSQL'

export const CHARSET_OPTIONS: DbCharsetOption[] = [
  { value: 'UTF8', label: 'UTF8' },
  { value: 'LATIN1', label: 'LATIN1' },
  { value: 'SQL_ASCII', label: 'SQL_ASCII' },
]

export const DEFAULT_CHARSET = CHARSET_OPTIONS[0].value
