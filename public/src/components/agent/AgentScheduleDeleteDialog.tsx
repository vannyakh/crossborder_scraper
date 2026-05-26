import { Box, Button, Field, HStack, Input, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { fieldStyles } from '../ui/field-styles'
import { AgentModalPanel } from './AgentModalPanel'
import type { AgentSchedule } from '../../lib/api'

const CONFIRM_PHRASE = 'confirm'

type AgentScheduleDeleteDialogProps = {
  open: boolean
  schedule: AgentSchedule | null
  deleting: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function AgentScheduleDeleteDialog({
  open,
  schedule,
  deleting,
  onClose,
  onConfirm,
}: AgentScheduleDeleteDialogProps) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (open) setTyped('')
  }, [open, schedule?.id])

  const canDelete = typed.trim().toLowerCase() === CONFIRM_PHRASE

  return (
    <AgentModalPanel
      open={open}
      onClose={onClose}
      title="Delete cron task"
      maxW="440px"
    >
      <Text fontSize="sm" color="fg.muted" mb={4}>
        This removes <Text as="span" fontWeight="semibold" color="fg">{schedule?.name}</Text>{' '}
        from the server schedule file. Running jobs are not cancelled automatically.
      </Text>

      <Field.Root>
        <Field.Label fontSize="xs" color="fg.muted">
          Type <Text as="span" fontFamily="mono">{CONFIRM_PHRASE}</Text> to delete
        </Field.Label>
        <Input
          {...fieldStyles}
          placeholder={CONFIRM_PHRASE}
          value={typed}
          autoComplete="off"
          onChange={(e) => setTyped(e.target.value)}
        />
      </Field.Root>

      <HStack justify="flex-end" gap={2} mt={6}>
        <Button variant="outline" borderColor="border.subtle" borderRadius="input" onClick={onClose}>
          Cancel
        </Button>
        <Button
          colorPalette="red"
          borderRadius="input"
          loading={deleting}
          disabled={!canDelete}
          onClick={() => void onConfirm()}
        >
          Delete task
        </Button>
      </HStack>

      {!canDelete && typed.length > 0 ? (
        <Box mt={2}>
          <Text fontSize="xs" color="fg.subtle">
            Enter exactly &quot;{CONFIRM_PHRASE}&quot; (lowercase).
          </Text>
        </Box>
      ) : null}
    </AgentModalPanel>
  )
}
