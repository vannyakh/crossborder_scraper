import type { DbCharsetOption } from '../types'

export const PLATFORM_ID = 'mongodb' as const
export const PRODUCT_LABEL = 'MongoDB'

export const CHARSET_OPTIONS: DbCharsetOption[] = [{ value: 'utf8mb4', label: 'utf8mb4 (default)' }]

export const DEFAULT_CHARSET = CHARSET_OPTIONS[0].value
