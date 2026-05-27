import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { RefreshCw } from 'lucide-react'
import { useMemo } from 'react'
import {
  useGatewayPromptsQuery,
  useGatewayStatusQuery,
  useIntegrateChannelQuery,
  useReloadIntegrateChannelMutation,
} from '../../hooks'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { FormFieldsSkeleton } from '../ui/PanelSkeleton'
import { Section, SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'
import { IntegrateChannelForm, integrateFormKey } from './IntegrateChannelForm'
import type { IntegrateChannelId } from './integrate-sections'
import {
  IntegrateSetupGuideButton,
  IntegrateSetupGuideViews,
  useIntegrateSetupGuideState,
} from './IntegrateSetupGuideDrawer'

function runnerHint(runner: 'live' | 'stored', runtimeActive: boolean): string {
  if (runner === 'live') {
    return runtimeActive ? 'Polling for messages' : 'Live runner · not polling'
  }
  return 'Credentials only · runner coming soon'
}

export function IntegrateChannelSetupPanel({ channelId }: { channelId: IntegrateChannelId }) {
  const accentPalette = useAccentPalette()
  const gatewayQuery = useGatewayStatusQuery()
  const channelQuery = useIntegrateChannelQuery(channelId)
  const promptsQuery = useGatewayPromptsQuery()
  const reloadMutation = useReloadIntegrateChannelMutation()
  const guide = useIntegrateSetupGuideState()

  const channel = channelQuery.data
  const prompts = promptsQuery.data?.items ?? []
  const aiReady =
    Boolean(gatewayQuery.data?.runtime?.ai?.ai_enabled) &&
    Boolean(gatewayQuery.data?.runtime?.ai?.ai_api_key_set)

  const statusTone = useMemo(() => {
    if (!channel) return 'neutral' as const
    if (channel.runtime_active) return 'success' as const
    if (channel.configured) return 'running' as const
    return 'neutral' as const
  }, [channel])

  const statusLabel = useMemo(() => {
    if (!channel) return 'loading'
    if (channel.runtime_active) return 'live'
    if (channel.enabled && channel.configured) return 'enabled'
    if (channel.configured) return 'configured'
    return 'not configured'
  }, [channel])

  if (channelQuery.isLoading || !channel) {
    return <FormFieldsSkeleton fields={6} />
  }

  return (
    <>
      <Section title={channel.label} description={channel.description} mt={0}>
        <SectionCard mb={4} p={4}>
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <HStack gap={2} flexWrap="wrap" minW={0}>
              <StatusBadge status={statusTone} label={statusLabel} />
              <Text fontSize="xs" color="fg.muted">
                {runnerHint(channel.runner, channel.runtime_active)}
              </Text>
            </HStack>

            <HStack gap={2} flexShrink={0}>
              <IntegrateSetupGuideButton
                onOpenDrawer={guide.openDrawer}
                onOpenFull={guide.openFull}
              />
              <Button
                size="sm"
                variant="outline"
                borderColor="border.subtle"
                onClick={() => {
                  void channelQuery.refetch()
                  void gatewayQuery.refetch()
                }}
                loading={channelQuery.isFetching}
              >
                <RefreshCw size={14} />
                Refresh
              </Button>
              {channel.runner === 'live' ? (
                <Button
                  size="sm"
                  variant="outline"
                  borderColor="border.subtle"
                  loading={reloadMutation.isPending}
                  onClick={() => void reloadMutation.mutateAsync(channelId)}
                >
                  Reload
                </Button>
              ) : null}
            </HStack>
          </HStack>

          {channelId === 'telegram' && !aiReady ? (
            <Box
              mt={3}
              px={3}
              py={2}
              borderRadius="var(--radius-input)"
              borderWidth="1px"
              borderColor="orange.300"
              bg="orange.50"
              _dark={{ bg: 'orange.950', borderColor: 'orange.800' }}
            >
              <Text fontSize="sm">
                Set up <strong>Settings → AI & LLM</strong> before the agent can reply on Telegram.
              </Text>
            </Box>
          ) : null}
        </SectionCard>

        <IntegrateChannelForm
          key={integrateFormKey(channel)}
          channel={channel}
          prompts={prompts}
          accentPalette={accentPalette}
        />
      </Section>

      <IntegrateSetupGuideViews
        channel={channel}
        drawerOpen={guide.drawerOpen}
        fullOpen={guide.fullOpen}
        onDrawerOpenChange={guide.setDrawerOpen}
        onFullOpenChange={guide.setFullOpen}
      />
    </>
  )
}
