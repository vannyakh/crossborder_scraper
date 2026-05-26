import { Box, Grid, Text } from '@chakra-ui/react'
import { EChart } from '../charts/EChart'
import { gaugeOption } from '../charts/chart-options'
import { useChartTheme } from '../../hooks/use-chart-theme'
import { Section } from '../ui/Section'
import { gaugePercent } from './dashboard-utils'

function ServiceGaugeTile({
  label,
  detail,
  percent,
  color,
}: {
  label: string
  detail: string
  percent: number
  color?: string
}) {
  const theme = useChartTheme()
  return (
    <Box
      p={3}
      borderRadius="var(--radius-card)"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.elevated"
      minH="120px"
    >
      <Text fontSize="sm" fontWeight="semibold" color="fg">
        {label}
      </Text>
      <Text mt={0.5} fontSize="xs" color="fg.muted">
        {detail}
      </Text>
      <EChart option={gaugeOption(theme, { value: percent, color })} height={88} />
    </Box>
  )
}

export function ServiceGaugePanel({
  active,
  maxJobs,
  running,
  products,
  proxies,
}: {
  active: number
  maxJobs: number
  running: number
  products: number
  proxies: number
}) {
  const theme = useChartTheme()

  return (
    <Section title="Service workload" description="Scraper engine and catalog utilization">
      <Grid
        templateColumns={{ base: '1fr', sm: '1fr 1fr', xl: 'repeat(4, 1fr)' }}
        gap={3}
      >
        <ServiceGaugeTile
          label="Engine load"
          detail={`${active} / ${maxJobs} workers`}
          percent={gaugePercent(active, maxJobs)}
          color={active >= maxJobs ? theme.warning : theme.accent}
        />
        <ServiceGaugeTile
          label="Running batches"
          detail={`${running} active`}
          percent={gaugePercent(running, Math.max(maxJobs, 1))}
          color={running > 0 ? theme.success : theme.accent}
        />
        <ServiceGaugeTile
          label="Catalog"
          detail={`${products} products`}
          percent={gaugePercent(products, 500)}
          color={theme.accent}
        />
        <ServiceGaugeTile
          label="Proxies"
          detail={proxies > 0 ? `${proxies} in pool` : 'Direct / none'}
          percent={proxies > 0 ? Math.min(100, proxies * 10) : 0}
          color={proxies > 0 ? theme.success : theme.track}
        />
      </Grid>
    </Section>
  )
}
