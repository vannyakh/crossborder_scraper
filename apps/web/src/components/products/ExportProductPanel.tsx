import { Box, Button, Checkbox, Code, Field, HStack, NativeSelect, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { fieldStyles } from '../ui/field-styles'
import { Panel, PanelBody, PanelHeader } from '../ui/Panel'
import { StatusBadge } from '../ui/StatusBadge'
import { useExportProductMutation, useMarketplacesQuery } from '../../hooks'

type ExportProductPanelProps = {
  productId: number
  productTitle?: string
}

export function ExportProductPanel({ productId, productTitle }: ExportProductPanelProps) {
  const { data: marketplaces } = useMarketplacesQuery()
  const exportMutation = useExportProductMutation()
  const [marketplace, setMarketplace] = useState('shopify')
  const [dryRun, setDryRun] = useState(true)
  const [result, setResult] = useState<string>('')

  const items = marketplaces?.items ?? []
  const selected = items.find((m) => m.id === marketplace)

  async function handleExport() {
    setResult('')
    try {
      const data = await exportMutation.mutateAsync({
        product_id: productId,
        marketplace,
        dry_run: dryRun,
      })
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setResult(String((err as Error).message || err))
    }
  }

  return (
    <Panel mt={4}>
      <PanelHeader
        title="Export to marketplace"
        description={productTitle ? `Listing preview for ${productTitle}` : undefined}
      />
      <PanelBody>
        <VStack align="stretch" gap={3}>
          <Field.Root>
            <Field.Label fontSize="xs" color="fg.muted">
              Marketplace
            </Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                {...fieldStyles}
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value)}
              >
                {items.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                    {m.configured ? '' : ' (not configured)'}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Field.Root>

          <HStack gap={2}>
            <StatusBadge
              status={selected?.configured ? 'success' : 'neutral'}
              label={selected?.configured ? 'API configured' : 'Dry-run only'}
            />
          </HStack>

          <Checkbox.Root
            checked={dryRun}
            onCheckedChange={(e) => setDryRun(!!e.checked)}
            colorPalette="blue"
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label fontSize="sm" color="fg.muted">
              Dry run (preview listing JSON, no publish)
            </Checkbox.Label>
          </Checkbox.Root>

          <Button
            size="sm"
            colorPalette="blue"
            borderRadius="input"
            loading={exportMutation.isPending}
            onClick={() => void handleExport()}
          >
            {dryRun ? 'Preview export' : 'Publish listing'}
          </Button>

          {result ? (
            <Box
              as="pre"
              maxH="280px"
              overflow="auto"
              p={3}
              borderRadius="input"
              borderWidth="1px"
              borderColor="border.subtle"
              bg="bg.input"
              fontSize="xs"
            >
              <Code display="block" whiteSpace="pre-wrap" color="fg.muted" bg="transparent">
                {result}
              </Code>
            </Box>
          ) : null}
        </VStack>
      </PanelBody>
    </Panel>
  )
}
