import { Button } from '@chakra-ui/react'
import { RefreshCw } from 'lucide-react'
import { WorkflowBatchesPanel } from '../components/workflow/WorkflowBatchesPanel'
import { WORKFLOW_PAGE } from '../components/workflow/workflow-sections'
import { Toolbar } from '../components/layout/Toolbar'
import { SectionCard } from '../components/ui/Section'
import { useBatchesQuery, useRuntimeStatusQuery } from '../hooks'

export function WorkflowPage() {
  const batches = useBatchesQuery(50)
  const runtime = useRuntimeStatusQuery()
  const refreshing = batches.isFetching || runtime.isFetching

  function refresh() {
    void batches.refetch()
    void runtime.refetch()
  }

  return (
    <>
      <Toolbar
        title={WORKFLOW_PAGE.title}
        description={WORKFLOW_PAGE.description}
        actions={
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            loading={refreshing}
            onClick={refresh}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        }
      />
      <SectionCard p={{ base: 3, md: 4 }} mb={0}>
        <WorkflowBatchesPanel />
      </SectionCard>
    </>
  )
}
