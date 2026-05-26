import {
  Button,
  Checkbox,
  Field,
  HStack,
  NativeSelect,
  SimpleGrid,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { fieldStyles } from '../ui/field-styles'
import { Panel, PanelBody, PanelHeader } from '../ui/Panel'
import { useDashboard } from '../../hooks/use-dashboard'

export function ScrapeSubmitPanel() {
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
    submit,
    clear,
    isSubmitting,
    error,
  } = useDashboard()

  return (
    <Panel mb={4}>
      <PanelHeader title="New batch" description="One product URL per line" />
      <PanelBody>
        <Field.Root>
          <Field.Label fontSize="xs" color="fg.muted">
            URLs
          </Field.Label>
          <Textarea
            {...fieldStyles}
            minH="100px"
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
          />
        </Field.Root>

        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3} mt={3}>
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
              AI extraction
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
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            onClick={clear}
          >
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
  )
}
