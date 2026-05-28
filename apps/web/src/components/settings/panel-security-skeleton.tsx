import { Box, Grid, HStack, SimpleGrid, VStack } from '@chakra-ui/react'
import { Globe, Lock, Shield } from 'lucide-react'
import { ShimmerBar, ShimmerBlock, ShimmerSurface } from '../ui/Shimmer'
import { StatusStripSkeleton } from '../ui/PanelSkeleton'
import { SettingsCard } from './panel-security-ui'

function SettingRowSkeleton({
  hint = true,
  variant = 'input-action',
}: {
  hint?: boolean
  variant?: 'input-action' | 'input-buttons' | 'plain'
}) {
  return (
    <Box
      py={3.5}
      borderTopWidth="1px"
      borderColor="border.muted"
      _first={{ borderTopWidth: 0, pt: 0 }}
    >
      <ShimmerBlock w="38%" h="13px" maxW="11rem" />
      {hint ? <ShimmerBlock w="72%" h="10px" maxW="18rem" mt={1.5} mb={2} /> : <Box mb={2} />}
      {variant === 'input-action' ? (
        <HStack gap={2} align="stretch" flexWrap={{ base: 'wrap', sm: 'nowrap' }}>
          <ShimmerBar
            flex={1}
            minW={{ base: 'full', sm: '10rem' }}
            h="2.5rem"
            radius="var(--radius-input)"
          />
          <ShimmerBar w="4.75rem" h="2rem" radius="var(--radius-input)" flexShrink={0} />
        </HStack>
      ) : variant === 'input-buttons' ? (
        <HStack gap={2} flexWrap="wrap">
          <ShimmerBar flex={1} minW="10rem" h="2.5rem" radius="var(--radius-input)" />
          <ShimmerBar w="2rem" h="2rem" radius="var(--radius-input)" />
          <ShimmerBar w="2rem" h="2rem" radius="var(--radius-input)" />
          <ShimmerBar w="3.5rem" h="2rem" radius="var(--radius-input)" />
        </HStack>
      ) : (
        <ShimmerBar w="full" h="2.5rem" radius="var(--radius-input)" />
      )}
    </Box>
  )
}

function LinkBlocksSkeleton() {
  return (
    <Box pt={1}>
      <ShimmerBlock w="4.5rem" h="10px" mb={2.5} />
      <VStack align="stretch" gap={2.5}>
        {Array.from({ length: 2 }).map((_, i) => (
          <Box key={i}>
            <ShimmerBlock w="3.5rem" h="10px" mb={1.5} />
            <ShimmerSurface
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="var(--radius-input)"
              bg="bg.input"
              overflow="hidden"
            >
              <HStack gap={0}>
                <ShimmerBar flex={1} h="2.25rem" radius="0" />
                <ShimmerBar w="3.25rem" h="2.25rem" radius="0" />
              </HStack>
            </ShimmerSurface>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}

function NoticeSkeleton() {
  return (
    <ShimmerSurface
      mt={3}
      px={3}
      py={2.5}
      borderRadius="md"
      bg="bg.muted"
      borderWidth="1px"
      borderColor="border.subtle"
    >
      <ShimmerBlock w="full" h="10px" />
      <ShimmerBlock w="85%" h="10px" mt={1.5} />
    </ShimmerSurface>
  )
}

function FirewallChecksSkeleton() {
  return (
    <VStack align="stretch" gap={4}>
      <Box borderTopWidth="1px" borderColor="border.muted" pt={1}>
        {Array.from({ length: 4 }).map((_, i) => (
          <HStack key={i} justify="space-between" align="center" gap={3} py={2}>
            <Box flex={1} minW={0}>
              <ShimmerBlock w={`${48 + (i % 2) * 20}%`} h="13px" maxW="12rem" />
              <ShimmerBlock w={`${64 + (i % 3) * 12}%`} h="10px" maxW="20rem" mt={1.5} />
            </Box>
            <ShimmerBlock w="2.75rem" h="1.35rem" radius="full" flexShrink={0} />
          </HStack>
        ))}
      </Box>
      <Box>
        <ShimmerBlock w="9rem" h="13px" mb={2} />
        <HStack gap={2} mb={2}>
          <ShimmerBlock flex={1} h="2rem" radius="md" />
          <ShimmerBlock w="3rem" h="1.75rem" radius="var(--radius-input)" />
        </HStack>
        <VStack align="stretch" gap={1.5} pl={4}>
          {Array.from({ length: 3 }).map((_, i) => (
            <ShimmerBlock key={i} w={i === 2 ? '78%' : '92%'} h="10px" />
          ))}
        </VStack>
      </Box>
    </VStack>
  )
}

export function NetworkSecuritySkeleton() {
  return (
    <>
      <StatusStripSkeleton items={3} />

      <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
        <SettingsCard icon={Globe} title="Access">
          <SettingRowSkeleton hint />
          <SettingRowSkeleton hint />
          <SettingRowSkeleton hint />
          <SettingRowSkeleton hint variant="input-buttons" />
          <LinkBlocksSkeleton />
        </SettingsCard>

        <SettingsCard icon={Lock} title="Login">
          <SettingRowSkeleton hint={false} />
          <SettingRowSkeleton hint={false} />
          <NoticeSkeleton />
        </SettingsCard>

        <Grid gridColumn={{ xl: '1 / -1' }}>
          <SettingsCard icon={Shield} title="Firewall">
            <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
              <ShimmerBlock w="min(220px, 55%)" h="10px" />
              <HStack gap={2} flexWrap="wrap">
                <ShimmerBar w="5.25rem" h="2rem" radius="var(--radius-input)" />
                <ShimmerBar w="5.5rem" h="2rem" radius="var(--radius-input)" />
                <ShimmerBar w="5.75rem" h="2rem" radius="var(--radius-input)" />
              </HStack>
            </HStack>
            <FirewallChecksSkeleton />
          </SettingsCard>
        </Grid>
      </SimpleGrid>
    </>
  )
}
