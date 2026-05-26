import { Grid, VStack } from '@chakra-ui/react'
import { AgentChatPanel } from '../components/agent/AgentChatPanel'
import { AgentSchedulesPanel } from '../components/agent/AgentSchedulesPanel'
import { Toolbar } from '../components/layout/Toolbar'
import { FadeIn } from '../components/motion/FadeIn'
import { Panel, PanelBody, PanelHeader } from '../components/ui/Panel'

export function AgentPage() {
  return (
    <VStack align="stretch" gap={0}>
      <Toolbar
        title="Gateway Agent"
        description="Chat with the scrape agent, inspect tool traces, and manage cron schedules."
      />
      <FadeIn>
        <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={4}>
          <Panel minH="520px">
            <PanelHeader title="Agent chat" description="Prompts from libs/prompts/*.md" />
            <PanelBody>
              <AgentChatPanel />
            </PanelBody>
          </Panel>
          <Panel>
            <PanelHeader title="Cron schedules" description="Background agent tasks" />
            <PanelBody>
              <AgentSchedulesPanel />
            </PanelBody>
          </Panel>
        </Grid>
      </FadeIn>
    </VStack>
  )
}
