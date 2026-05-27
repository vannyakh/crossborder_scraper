export type ScrapeCapabilities = {
  supports_login: boolean
  supports_pagination: boolean
  supports_variants: boolean
  supports_browser: boolean
  supports_ai_extraction: boolean
  supports_ai_enrichment: boolean
  supports_batch: boolean
  max_concurrency: number
  requires_cookies: boolean
  anti_bot_level: 'low' | 'medium' | 'high'
}

export type PluginScrapeSpec = {
  plugin_type: string
  market: string
  data_fields: string[]
  page_types: string[]
  example_urls: string[]
  output_model: string
  currency_default: string
  capabilities: ScrapeCapabilities
  notes: string
  standard_fields_available?: string[]
}

export const PLUGIN_TYPE_LABEL: Record<string, string> = {
  ecommerce_product: 'E-commerce product',
  ecommerce_wholesale: 'Wholesale / B2B',
  social_content: 'Social content',
  marketplace_export: 'Marketplace export',
  custom: 'Custom',
}

export const MARKET_LABEL: Record<string, string> = {
  b2b: 'B2B wholesale',
  b2c: 'B2C retail',
  social: 'Social',
  crossborder: 'Cross-border',
  custom: 'Custom',
}

export const DATA_FIELD_LABEL: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  price: 'Price',
  currency: 'Currency',
  images: 'Images',
  variants: 'Variants / SKUs',
  sku: 'SKU',
  category: 'Category',
  seller_name: 'Seller name',
  seller_id: 'Seller ID',
  min_order_qty: 'Min order qty',
  attributes: 'Attributes',
  source_url: 'Source URL',
  source_product_id: 'Product ID',
}
