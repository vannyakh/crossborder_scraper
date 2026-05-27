import {
  Box,
  Button,
  Code,
  Field,
  Grid,
  HStack,
  Input,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import {
  useGatewayToolsQuery,
  useGatewayWorkflowsQuery,
  useRunWorkflowMutation,
} from '../../hooks'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { fieldStyles } from '../ui/field-styles'
import { Section, SectionCard } from '../ui/Section'
import { ListCardRowsSkeleton, FormFieldsSkeleton } from '../ui/PanelSkeleton'
import { StatusBadge } from '../ui/StatusBadge'

export function AgentToolsPanel() {
  const { data, isLoading, error } = useGatewayToolsQuery()

  return (
    <Section
      title="Tool catalog"
      description="Tools the gateway agent can call during chat and cron runs"
      mt={0}
    >
      <SectionCard>
        {error ? (
          <Text fontSize="sm" color="red.500">
            {String((error as Error).message || error)}
          </Text>
        ) : isLoading ? (
          <ListCardRowsSkeleton rows={4} />
        ) : (
          <VStack align="stretch" gap={3}>
            {(data?.items ?? []).map((tool) => (
              <Box
                key={tool.name}
                p={3}
                borderWidth="1px"
                borderColor="border.subtle"
                borderRadius="var(--radius-card)"
                bg="bg.panel"
              >
                <HStack gap={2} mb={1}>
                  <StatusBadge status="brand" label={tool.name} />
                </HStack>
                <Text fontSize="sm" color="fg.muted" mb={2}>
                  {tool.description}
                </Text>
                <Text fontSize="xs" color="fg.subtle" mb={1}>
                  Parameters
                </Text>
                <Code
                  display="block"
                  whiteSpace="pre-wrap"
                  p={2}
                  borderRadius="sm"
                  fontSize="xs"
                  maxH="200px"
                  overflowY="auto"
                >
                  {JSON.stringify(tool.parameters, null, 2)}
                </Code>
              </Box>
            ))}
          </VStack>
        )}
      </SectionCard>
    </Section>
  )
}

export function AgentWorkflowsPanel() {
  const accentPalette = useAccentPalette()
  const workflowsQuery = useGatewayWorkflowsQuery()
  const runMutation = useRunWorkflowMutation()
  const workflows = workflowsQuery.data?.items ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [lastResult, setLastResult] = useState<string | null>(null)

  const selected = workflows.find((w) => w.id === (selectedId ?? workflows[0]?.id))

  function handleSelect(id: string) {
    setSelectedId(id)
    setLastResult(null)
    const wf = workflows.find((w) => w.id === id)
    if (wf) {
      const next: Record<string, string> = {}
      for (const key of wf.inputs) {
        next[key] = inputs[key] ?? ''
      }
      setInputs(next)
    }
  }

  async function handleRun() {
    if (!selected) return
    const payload: Record<string, unknown> = {}
    for (const key of selected.inputs) {
      const raw = inputs[key]?.trim()
      if (!raw) continue
      if (key === 'urls') {
        payload[key] = raw.split('\n').map((s) => s.trim()).filter(Boolean)
      } else if (key === 'use_ai') {
        payload[key] = raw === 'true'
      } else {
        payload[key] = raw
      }
    }
    const result = await runMutation.mutateAsync({ workflowId: selected.id, inputs: payload })
    setLastResult(JSON.stringify(result, null, 2))
  }

  return (
    <Section
      title="Workflows"
      description="Declarative multi-step pipelines (scrape, export, catalog snapshot)"
      mt={0}
    >
      <Grid templateColumns={{ base: '1fr', lg: 'minmax(240px, 280px) 1fr' }} gap={4}>
        {workflowsQuery.isLoading ? (
          <>
            <ListCardRowsSkeleton rows={4} />
            <SectionCard>
              <FormFieldsSkeleton fields={3} />
            </SectionCard>
          </>
        ) : (
          <>
        <VStack align="stretch" gap={2}>
          {workflows.map((wf) => (
            <button
              key={wf.id}
              type="button"
              style={{
                textAlign: 'left',
                padding: '0.75rem',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor:
                  selected?.id === wf.id
                    ? 'color-mix(in srgb, var(--app-accent) 40%, transparent)'
                    : 'var(--chakra-colors-border-subtle)',
                borderRadius: 'var(--radius-card)',
                background:
                  selected?.id === wf.id
                    ? 'var(--nav-active-bg)'
                    : 'var(--chakra-colors-bg-panel)',
                cursor: 'pointer',
                width: '100%',
              }}
              onClick={() => handleSelect(wf.id)}
            >
              <Text fontSize="sm" fontWeight="semibold" lineClamp={1}>
                {wf.label}
              </Text>
              <Text mt={0.5} fontSize="xs" color="fg.muted" lineClamp={2}>
                {wf.description}
              </Text>
              <HStack mt={2} gap={1} flexWrap="wrap">
                {wf.steps.map((step) => (
                  <StatusBadge key={step} status="neutral" label={step} />
                ))}
              </HStack>
            </button>
          ))}
        </VStack>

        <SectionCard>
          {!selected ? (
            <Text fontSize="sm" color="fg.muted">
              No workflows available.
            </Text>
          ) : (
            <VStack align="stretch" gap={3}>
              <Text fontSize="sm" fontWeight="semibold">
                {selected.label}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {selected.description}
              </Text>
              {selected.inputs.length ? (
                <SimpleGrid columns={1} gap={3}>
                  {selected.inputs.map((key) => (
                    <Field.Root key={key}>
                      <Field.Label fontSize="xs" color="fg.muted">
                        {key}
                      </Field.Label>
                      {key === 'urls' ? (
                        <Textarea
                          {...fieldStyles}
                          rows={3}
                          value={inputs[key] ?? ''}
                          placeholder="One URL per line"
                          onChange={(e) => setInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                        />
                      ) : (
                        <Input
                          {...fieldStyles}
                          value={inputs[key] ?? ''}
                          placeholder={key === 'use_ai' ? 'true or false' : key}
                          onChange={(e) => setInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                        />
                      )}
                    </Field.Root>
                  ))}
                </SimpleGrid>
              ) : (
                <Text fontSize="sm" color="fg.muted">
                  No inputs required — runs catalog snapshot tools.
                </Text>
              )}
              <Button
                size="sm"
                colorPalette={accentPalette}
                loading={runMutation.isPending}
                onClick={() => void handleRun()}
              >
                Run workflow
              </Button>
              {lastResult ? (
                <Box>
                  <Text fontSize="xs" color="fg.muted" mb={1}>
                    Last result
                  </Text>
                  <Code display="block" whiteSpace="pre-wrap" p={2} fontSize="xs" maxH="320px" overflowY="auto">
                    {lastResult}
                  </Code>
                </Box>
              ) : null}
            </VStack>
          )}
        </SectionCard>
          </>
        )}
      </Grid>
    </Section>
  )
}
