import { Badge, Box, Grid, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { ExternalLink } from 'lucide-react'
import type { PluginScrapeSpec } from '../../lib/api/plugin-spec'
import { DATA_FIELD_LABEL, MARKET_LABEL, PLUGIN_TYPE_LABEL } from '../../lib/api/plugin-spec'
import { SectionCard } from '../ui/Section'

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack
      justify="space-between"
      align="start"
      py={2}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      gap={4}
      fontSize="sm"
    >
      <Text color="fg.muted" flexShrink={0}>
        {label}
      </Text>
      <Text fontWeight="medium" textAlign="right" lineClamp={3}>
        {value}
      </Text>
    </HStack>
  )
}

function CapBadge({ on, label }: { on: boolean; label: string }) {
  return (
    <Badge
      size="sm"
      variant={on ? 'solid' : 'subtle'}
      colorPalette={on ? 'green' : 'gray'}
      textTransform="none"
    >
      {label}
    </Badge>
  )
}

export function PluginScrapeSpecPanel({ spec }: { spec: PluginScrapeSpec }) {
  const caps = spec.capabilities

  return (
    <VStack align="stretch" gap={4}>
      <SectionCard>
        <SpecRow
          label="Plugin type"
          value={PLUGIN_TYPE_LABEL[spec.plugin_type] ?? spec.plugin_type}
        />
        <SpecRow label="Market" value={MARKET_LABEL[spec.market] ?? spec.market} />
        <SpecRow label="Output model" value={spec.output_model} />
        <SpecRow label="Default currency" value={spec.currency_default} />
        {spec.notes ? <SpecRow label="Notes" value={spec.notes} /> : null}
      </SectionCard>

      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2}>
          Data fields extracted
        </Text>
        <HStack gap={1.5} flexWrap="wrap">
          {spec.data_fields.map((field) => (
            <Badge key={field} size="sm" variant="subtle" colorPalette="blue" textTransform="none">
              {DATA_FIELD_LABEL[field] ?? field}
            </Badge>
          ))}
        </HStack>
      </Box>

      {spec.page_types.length > 0 ? (
        <Box>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            Page types
          </Text>
          <HStack gap={1.5} flexWrap="wrap">
            {spec.page_types.map((pt) => (
              <Badge key={pt} size="sm" variant="outline" textTransform="none">
                {pt.replace(/_/g, ' ')}
              </Badge>
            ))}
          </HStack>
        </Box>
      ) : null}

      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2}>
          Capabilities
        </Text>
        <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(3, 1fr)' }} gap={2}>
          <CapBadge on={caps.supports_browser} label="Browser" />
          <CapBadge on={caps.supports_login} label="Login" />
          <CapBadge on={caps.supports_pagination} label="Pagination" />
          <CapBadge on={caps.supports_variants} label="Variants" />
          <CapBadge on={caps.supports_ai_extraction} label="AI extract" />
          <CapBadge on={caps.supports_ai_enrichment} label="AI enrich" />
          <CapBadge on={caps.supports_batch} label="Batch jobs" />
          <CapBadge on={caps.requires_cookies} label="Cookies" />
          <Badge size="sm" variant="subtle" textTransform="none">
            Anti-bot: {caps.anti_bot_level}
          </Badge>
          <Badge size="sm" variant="subtle" textTransform="none">
            Concurrency: {caps.max_concurrency}
          </Badge>
        </Grid>
      </Box>

      {spec.example_urls.length > 0 ? (
        <Box>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            Example URLs
          </Text>
          <VStack align="stretch" gap={1}>
            {spec.example_urls.map((url) => (
              <HStack key={url} gap={2} fontSize="xs" color="fg.muted">
                <ExternalLink size={12} />
                <Link href={url} target="_blank" rel="noreferrer" lineClamp={1}>
                  {url}
                </Link>
              </HStack>
            ))}
          </VStack>
        </Box>
      ) : null}
    </VStack>
  )
}

export function PluginScrapeSpecSummary({ spec }: { spec: PluginScrapeSpec }) {
  return (
    <HStack gap={1.5} flexWrap="wrap" mt={2}>
      <Badge size="sm" variant="subtle" colorPalette="purple" textTransform="none">
        {PLUGIN_TYPE_LABEL[spec.plugin_type] ?? spec.plugin_type}
      </Badge>
      {spec.data_fields.slice(0, 5).map((f) => (
        <Badge key={f} size="sm" variant="outline" textTransform="none">
          {DATA_FIELD_LABEL[f] ?? f}
        </Badge>
      ))}
      {spec.data_fields.length > 5 ? (
        <Text fontSize="xs" color="fg.subtle">
          +{spec.data_fields.length - 5} fields
        </Text>
      ) : null}
    </HStack>
  )
}
