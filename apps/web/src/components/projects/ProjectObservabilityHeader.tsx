import { Badge, Box, HStack, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useLocale } from '../../hooks/use-locale'

export type ObservabilityStat = {
  label: string
  value: string
  tone?: 'default' | 'success' | 'danger' | 'accent'
}

export function ProjectObservabilityHeader({
  title,
  description,
  icon,
  stats,
}: {
  title: string
  description?: string
  icon?: ReactNode
  stats?: ObservabilityStat[]
}) {
  const { t } = useLocale()

  return (
    <Box className="project-observe-header" px={{ base: 3, md: 4 }} pt={{ base: 3, md: 4 }} pb={3}>
      <HStack align="flex-start" justify="space-between" gap={3} flexWrap="wrap">
        <HStack align="flex-start" gap={3} minW={0}>
          {icon ? (
            <Box className="project-observe-header__icon" aria-hidden>
              {icon}
            </Box>
          ) : null}
          <VStack align="stretch" gap={0.5} minW={0}>
            <HStack gap={2} flexWrap="wrap">
              <Text fontWeight="semibold" fontSize="lg" lineHeight="1.2">
                {title}
              </Text>
              <Badge size="sm" variant="subtle" colorPalette="gray" textTransform="none">
                {t('projects.observe.previewBadge')}
              </Badge>
            </HStack>
            {description ? (
              <Text fontSize="sm" color="fg.muted" lineClamp={2}>
                {description}
              </Text>
            ) : null}
          </VStack>
        </HStack>

        {stats && stats.length > 0 ? (
          <HStack className="project-observe-stats" gap={2} flexWrap="wrap" flexShrink={0}>
            {stats.map((stat) => (
              <ObservabilityStatCard key={stat.label} {...stat} />
            ))}
          </HStack>
        ) : null}
      </HStack>
    </Box>
  )
}

function ObservabilityStatCard({ label, value, tone = 'default' }: ObservabilityStat) {
  const color =
    tone === 'success'
      ? 'green.300'
      : tone === 'danger'
        ? 'red.300'
        : tone === 'accent'
          ? 'fg'
          : 'fg'

  return (
    <Box className="project-observe-stat" px={3} py={2} minW="5.5rem">
      <Text fontSize="2xs" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="semibold" color={color} mt={0.5} lineClamp={1}>
        {value}
      </Text>
    </Box>
  )
}
