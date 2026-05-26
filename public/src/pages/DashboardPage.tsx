import {
  Box,
  Button,
  Checkbox,
  Field,
  Grid,
  HStack,
  NativeSelect,
  Separator,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { motion } from 'motion/react'
import { FadeIn } from '../components/motion/FadeIn'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel, PanelBody, PanelHeader } from '../components/ui/Panel'
import { StatCard } from '../components/ui/StatCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { fieldStyles } from '../components/ui/field-styles'
import { useDashboard } from '../hooks/use-dashboard'

const MotionBox = motion.create(Box)

export function DashboardPage() {
  const {
    urlsText,
    workers,
    useAi,
    save,
    urls,
    setUrlsText,
    setWorkers,
    setUseAi,
    setSave,
    config,
    stats,
    apiReady,
    batchId,
    status,
    result,
    isRunning,
    submit,
    clear,
    isSubmitting,
    error,
  } = useDashboard()

  return (
    <VStack align="stretch" gap={5}>
      <PageHeader
        title="Dashboard"
        description="Submit scrape jobs and monitor the engine in real time."
        action={
          <StatusBadge
            status={apiReady ? 'success' : 'danger'}
            label={apiReady ? 'API ready' : 'API offline'}
          />
        }
      />

      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={4}>
        <FadeIn delay={0.05}>
          <Panel h="full">
            <PanelHeader
              title="Submit jobs"
              description="Paste product URLs (one per line). Workers use cookies and proxies from the server."
            />
            <PanelBody>
              <Field.Root>
                <Field.Label color="fg.muted" fontSize="xs">
                  URLs
                </Field.Label>
                <Textarea
                  {...fieldStyles}
                  minH="140px"
                  value={urlsText}
                  onChange={(e) => setUrlsText(e.target.value)}
                />
              </Field.Root>

              <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3} mt={4}>
                <Field.Root>
                  <Field.Label color="fg.muted" fontSize="xs">
                    Workers
                  </Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      {...fieldStyles}
                      value={String(workers)}
                      onChange={(e) => setWorkers(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label color="fg.muted" fontSize="xs">
                    AI extraction
                  </Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      {...fieldStyles}
                      value={useAi ? 'true' : 'false'}
                      onChange={(e) => setUseAi(e.target.value === 'true')}
                    >
                      <option value="false">Auto / Disabled</option>
                      <option value="true">Force AI</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
              </SimpleGrid>

              <Checkbox.Root
                mt={4}
                checked={save}
                onCheckedChange={(e) => setSave(!!e.checked)}
                colorPalette="purple"
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label fontSize="sm" color="fg.muted">
                  Save results (SQLite + JSON)
                </Checkbox.Label>
              </Checkbox.Root>

              <HStack mt={4} gap={2} flexWrap="wrap">
                <Button
                  colorPalette="purple"
                  borderRadius="input"
                  loading={isSubmitting}
                  disabled={urls.length === 0}
                  onClick={() => void submit()}
                >
                  {isSubmitting ? 'Submitting…' : `Submit (${urls.length})`}
                </Button>
                <Button
                  variant="outline"
                  borderColor="border.subtle"
                  borderRadius="input"
                  onClick={clear}
                >
                  Clear
                </Button>
              </HStack>

              {error ? (
                <>
                  <Separator my={4} borderColor="border.subtle" />
                  <Text fontSize="sm" color="red.400">
                    {error}
                  </Text>
                </>
              ) : null}
            </PanelBody>
          </Panel>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Panel h="full">
            <PanelHeader title="Engine & batch" description="Live config from the API server." />
            <PanelBody>
              <SimpleGrid columns={{ base: 2, sm: 3 }} gap={3}>
                <StatCard label="Workers" value={config?.max_concurrent_jobs ?? '—'} />
                <StatCard label="Products" value={stats?.products ?? '—'} tone="accent" />
                <StatCard label="Files" value={stats?.output_files ?? '—'} />
                <StatCard label="AI" value={String(config?.ai_enabled ?? false)} />
                <StatCard
                  label="Proxy"
                  value={config?.proxy_list_path?.split(/[/\\]/).pop() ?? '—'}
                  mono
                  small
                />
                <StatCard
                  label="Completed"
                  value={status ? `${status.completed}/${status.total}` : '—'}
                />
                <StatCard label="Success" value={status?.success ?? '—'} tone="success" />
                <StatCard label="Failed" value={status?.failed ?? '—'} tone="danger" />
              </SimpleGrid>

              <Separator my={4} borderColor="border.subtle" />

              <Text fontSize="xs" color="fg.muted">
                Batch ID
              </Text>
              <Text fontFamily="mono" fontSize="sm" mt={1} wordBreak="break-all">
                {batchId || '—'}
              </Text>
              {isRunning ? (
                <Text mt={2} fontSize="xs" color="accent">
                  Running — refreshing every 1.5s
                </Text>
              ) : null}
            </PanelBody>
          </Panel>
        </FadeIn>
      </Grid>

      <FadeIn delay={0.15}>
        <Panel>
          <PanelHeader
            title="Results"
            description="Job outcomes appear when the batch completes."
          />
          <PanelBody>
            {!result ? (
              <Text fontSize="sm" color="fg.muted">
                No results yet.
              </Text>
            ) : (
              <VStack align="stretch" gap={2}>
                {result.results.map((r, i) => (
                  <MotionBox
                    key={r.job_id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    p={3}
                    borderRadius="card"
                    borderWidth="1px"
                    borderColor="border.subtle"
                    bg="bg.elevated"
                  >
                    <HStack justify="space-between" align="flex-start" gap={2}>
                      <Text fontSize="sm" wordBreak="break-all" flex={1}>
                        {r.url}
                      </Text>
                      <StatusBadge status={r.status === 'success' ? 'success' : 'danger'} />
                    </HStack>
                    <HStack mt={2} gap={3} flexWrap="wrap" fontSize="xs" color="fg.muted">
                      <Text fontFamily="mono">job {r.job_id}</Text>
                      <Text>{r.duration_seconds ?? 0}s</Text>
                      <Text fontFamily="mono">proxy {r.proxy_used || '—'}</Text>
                      {r.product?.title ? <Text>{r.product.title.slice(0, 80)}</Text> : null}
                      {r.error ? <Text color="red.400">error: {r.error}</Text> : null}
                    </HStack>
                  </MotionBox>
                ))}
              </VStack>
            )}
          </PanelBody>
        </Panel>
      </FadeIn>
    </VStack>
  )
}
