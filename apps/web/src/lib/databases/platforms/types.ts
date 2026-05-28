export type DbCharsetOption = {
  value: string
  label: string
}

export type DatabasePlatformModule = {
  PLATFORM_ID: string
  PRODUCT_LABEL: string
  CHARSET_OPTIONS?: DbCharsetOption[]
  DEFAULT_CHARSET?: string
}
