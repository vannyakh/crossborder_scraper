import {
  Box,
  Button,
  Checkbox,
  Field,
  Grid,
  HStack,
  NativeSelect,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { Toolbar } from '../components/layout/Toolbar'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { fieldStyles } from '../components/ui/field-styles'
import { Panel, PanelBody, PanelHeader } from '../components/ui/Panel'
import { StatCard } from '../components/ui/StatCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useDashboard } from '../hooks/use-dashboard'

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
    <VStack align="stretch" gap={0}>
      <Toolbar
        title="Home"
        description="Submit scrape jobs and monitor the engine."
        actions={
          <StatusBadge
            status={apiReady ? 'success' : 'danger'}
            label={apiReady ? 'Online' : 'Offline'}
          />
        }
      />

      <Stagger>
      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={4}>
        <StaggerItem>
        <Panel>
          <PanelHeader title="New task" description="One URL per line" />
          <PanelBody>
            <Field.Root>
              <Field.Label fontSize="xs" color="fg.muted">
                URLs
              </Field.Label>
              <Textarea {...fieldStyles} minH="120px" value={urlsText} onChange={(e) => setUrlsText(e.target.value)} />
            </Field.Root>

            <SimpleGrid columns={2} gap={3} mt={3}>
              <Field.Root>
                <Field.Label fontSize="xs" color="fg.muted">
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
                <Field.Label fontSize="xs" color="fg.muted">
                  AI
                </Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    {...fieldStyles}
                    value={useAi ? 'true' : 'false'}
                    onChange={(e) => setUseAi(e.target.value === 'true')}
                  >
                    <option value="false">Off</option>
                    <option value="true">On</option>
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </Field.Root>
            </SimpleGrid>

            <Checkbox.Root
              mt={3}
              checked={save}
              onCheckedChange={(e) => setSave(!!e.checked)}
              colorPalette="blue"
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label fontSize="sm" color="fg.muted">
                Save to database
              </Checkbox.Label>
            </Checkbox.Root>

            <HStack mt={4} gap={2}>
              <Button
                colorPalette="blue"
                size="sm"
                borderRadius="input"
                loading={isSubmitting}
                disabled={urls.length === 0}
                onClick={() => void submit()}
              >
                Submit ({urls.length})
              </Button>
              <Button size="sm" variant="outline" borderColor="border.subtle" borderRadius="input" onClick={clear}>
                Clear
              </Button>
            </HStack>

            {error ? (
              <Text mt={3} fontSize="sm" color="red.500">
                {error}
              </Text>
            ) : null}
          </PanelBody>
        </Panel>
        </StaggerItem>

        <StaggerItem>
        <Panel>
          <PanelHeader title="Status" />
          <PanelBody>
            <SimpleGrid columns={2} gap={2}>
              <StatCard label="Workers" value={config?.max_concurrent_jobs ?? '—'} />
              <StatCard label="Products" value={stats?.products ?? '—'} />
              <StatCard label="Files" value={stats?.output_files ?? '—'} />
              <StatCard label="Batch" value={batchId ? batchId.slice(0, 8) : '—'} mono small />
              <StatCard
                label="Progress"
                value={status ? `${status.completed}/${status.total}` : '—'}
              />
              <StatCard label="OK / Fail" value={status ? `${status.success} / ${status.failed}` : '—'} />
            </SimpleGrid>
            {isRunning ? (
              <Text mt={2} fontSize="xs" color="brand.emphasis">
                Running…
              </Text>
            ) : null}
          </PanelBody>
        </Panel>
        </StaggerItem>
      </Grid>

      {result ? (
        <StaggerItem>
        <Panel mt={4}>
          <PanelHeader title="Results" description={`${result.results.length} jobs`} />
          <PanelBody p={0}>
            <Box maxH="320px" overflowY="auto">
              {result.results.map((r) => (
                <HStack
                  key={r.job_id}
                  px={4}
                  py={2}
                  borderBottomWidth="1px"
                  borderColor="border.subtle"
                  fontSize="sm"
                  _last={{ borderBottomWidth: 0 }}
                >
                  <StatusBadge status={r.status === 'success' ? 'success' : 'danger'} label={r.status} />
                  <Text flex={1} truncate title={r.url}>
                    {r.url}
                  </Text>
                  <Text fontSize="xs" color="fg.muted" fontFamily="mono">
                    {r.duration_seconds ?? 0}s
                  </Text>
                </HStack>
              ))}
            </Box>
          </PanelBody>
        </Panel>
        </StaggerItem>
      ) : null}
      </Stagger>
    </VStack>
  )
}
