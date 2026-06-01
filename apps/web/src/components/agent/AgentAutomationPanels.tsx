import {
  Badge,
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
import { CheckCircle, ChevronRight, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useGatewayWorkflowsQuery, useRunWorkflowMutation } from '../../hooks'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { fieldStyles } from '../ui/field-styles'
import { Section, SectionCard } from '../ui/Section'
import { ListCardRowsSkeleton, FormFieldsSkeleton } from '../ui/PanelSkeleton'

type RunHistoryEntry = {
  id: string
  workflowLabel: string
  ok: boolean
  summary: string
  ranAt: Date
}

function StepChain({ steps }: { steps: string[] }) {
  return (
    <HStack gap={0} flexWrap="wrap" my={1}>
      {steps.map((step, i) => (
        <HStack key={step} gap={0}>
          <Badge
            size="sm"
            variant="subtle"
            colorPalette="gray"
            fontSize="0.7rem"
            px={1.5}
            py={0.5}
            borderRadius="full"
          >
            {step}
          </Badge>
          {i < steps.length - 1 ? (
            <Box color="fg.subtle" mx={0.5}>
              <ChevronRight size={12} />
            </Box>
          ) : null}
        </HStack>
      ))}
    </HStack>
  )
}

function parseResultSummary(raw: unknown): { ok: boolean; summary: string } {
  try {
    const obj = typeof raw === 'object' && raw !== null ? raw : JSON.parse(String(raw))
    const ok = (obj as Record<string, unknown>).ok !== false
    const msgs: string[] = []
    const r = obj as Record<string, unknown>
    if (typeof r.message === 'string') msgs.push(r.message)
    if (typeof r.products_saved === 'number') msgs.push(`${r.products_saved} products saved`)
    if (typeof r.items_count === 'number') msgs.push(`${r.items_count} items`)
    if (typeof r.batches === 'number') msgs.push(`${r.batches} batches`)
    if (typeof r.error === 'string') msgs.push(r.error)
    return { ok, summary: msgs.join(' · ') || (ok ? 'Completed' : 'Failed') }
  } catch {
    return { ok: true, summary: 'Completed' }
  }
}

export function AgentWorkflowsPanel() {
  const accentPalette = useAccentPalette()
  const workflowsQuery = useGatewayWorkflowsQuery()
  const runMutation = useRunWorkflowMutation()
  const workflows = workflowsQuery.data?.items ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [lastResult, setLastResult] = useState<unknown>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([])

  const selected = workflows.find((w) => w.id === (selectedId ?? workflows[0]?.id))

  function handleSelect(id: string) {
    setSelectedId(id)
    setLastResult(null)
    setShowRaw(false)
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
        payload[key] = raw
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      } else if (key === 'use_ai') {
        payload[key] = raw === 'true'
      } else {
        payload[key] = raw
      }
    }
    const result = await runMutation.mutateAsync({ workflowId: selected.id, inputs: payload })
    setLastResult(result)
    const { ok, summary } = parseResultSummary(result)
    setRunHistory((prev) =>
      [
        {
          id: `${Date.now()}`,
          workflowLabel: selected.label,
          ok,
          summary,
          ranAt: new Date(),
        },
        ...prev,
      ].slice(0, 10),
    )
  }

  const resultSummary = lastResult !== null ? parseResultSummary(lastResult) : null

  return (
    <Section
      title="Workflows"
      description="Declarative multi-step pipelines — scrape, export, catalog snapshot"
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
                  <StepChain steps={wf.steps} />
                </button>
              ))}

              {/* Recent runs */}
              {runHistory.length > 0 ? (
                <Box mt={2} pt={2} borderTopWidth="1px" borderColor="border.subtle">
                  <Text fontSize="xs" color="fg.muted" mb={1.5}>
                    Recent runs
                  </Text>
                  <VStack align="stretch" gap={1}>
                    {runHistory.map((entry) => (
                      <HStack key={entry.id} gap={1.5} align="flex-start">
                        <Box
                          flexShrink={0}
                          color={entry.ok ? 'green.fg' : 'red.fg'}
                          mt={0.5}
                        >
                          {entry.ok ? (
                            <CheckCircle size={12} />
                          ) : (
                            <XCircle size={12} />
                          )}
                        </Box>
                        <Box minW={0}>
                          <Text fontSize="xs" fontWeight="medium" lineClamp={1}>
                            {entry.workflowLabel}
                          </Text>
                          <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                            {entry.summary}
                          </Text>
                        </Box>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              ) : null}
            </VStack>

            <SectionCard>
              {!selected ? (
                <Text fontSize="sm" color="fg.muted">
                  No workflows available.
                </Text>
              ) : (
                <VStack align="stretch" gap={3}>
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold">
                      {selected.label}
                    </Text>
                    <Text mt={0.5} fontSize="sm" color="fg.muted">
                      {selected.description}
                    </Text>
                    <Box mt={1.5}>
                      <StepChain steps={selected.steps} />
                    </Box>
                  </Box>

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
                              onChange={(e) =>
                                setInputs((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                            />
                          ) : (
                            <Input
                              {...fieldStyles}
                              value={inputs[key] ?? ''}
                              placeholder={key === 'use_ai' ? 'true or false' : key}
                              onChange={(e) =>
                                setInputs((prev) => ({ ...prev, [key]: e.target.value }))
                              }
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

                  {resultSummary ? (
                    <Box
                      p={3}
                      borderRadius="var(--radius-card)"
                      borderWidth="1px"
                      borderColor={resultSummary.ok ? 'green.subtle' : 'red.subtle'}
                      bg={resultSummary.ok ? 'green.subtle' : 'red.subtle'}
                    >
                      <HStack gap={2} mb={1}>
                        <Box color={resultSummary.ok ? 'green.fg' : 'red.fg'}>
                          {resultSummary.ok ? (
                            <CheckCircle size={14} />
                          ) : (
                            <XCircle size={14} />
                          )}
                        </Box>
                        <Text
                          fontSize="sm"
                          fontWeight="semibold"
                          color={resultSummary.ok ? 'green.fg' : 'red.fg'}
                        >
                          {resultSummary.ok ? 'Workflow completed' : 'Workflow failed'}
                        </Text>
                      </HStack>
                      {resultSummary.summary ? (
                        <Text fontSize="xs" color="fg.muted">
                          {resultSummary.summary}
                        </Text>
                      ) : null}
                      <button
                        type="button"
                        style={{
                          marginTop: '0.5rem',
                          fontSize: '0.75rem',
                          color: 'var(--app-accent)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        onClick={() => setShowRaw((v) => !v)}
                      >
                        {showRaw ? 'Hide raw output' : 'Show raw output'}
                      </button>
                      {showRaw ? (
                        <Code
                          display="block"
                          whiteSpace="pre-wrap"
                          p={2}
                          mt={2}
                          fontSize="xs"
                          maxH="260px"
                          overflowY="auto"
                          className="app-scroll"
                        >
                          {JSON.stringify(lastResult, null, 2)}
                        </Code>
                      ) : null}
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
