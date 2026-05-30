import { Button, Field, Input, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { fieldStyles } from '../ui/field-styles'
import { PanelDialog } from '../ui/PanelDialog'
import type { ProjectNode } from './project-sample-data'

export const FLOW_NODE_REMOVE_CONFIRM_PHRASE = 'DELETE'

type ProjectFlowRemoveNodeDialogProps = {
  node: ProjectNode | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ProjectFlowRemoveNodeDialog({
  node,
  open,
  onClose,
  onConfirm,
}: ProjectFlowRemoveNodeDialogProps) {
  const { t } = useLocale()
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (open) setDraft('')
  }, [open, node?.id])

  const canConfirm = Boolean(node) && draft === FLOW_NODE_REMOVE_CONFIRM_PHRASE

  const footer = (
    <>
      <Button variant="outline" onClick={onClose}>
        {t('projects.nodeMenu.removeConfirm.cancel')}
      </Button>
      <Button
        colorPalette="red"
        disabled={!canConfirm}
        onClick={() => {
          if (!canConfirm) return
          onConfirm()
        }}
      >
        {t('projects.nodeMenu.removeConfirm.confirm')}
      </Button>
    </>
  )

  return (
    <PanelDialog
      open={open}
      onClose={onClose}
      title={t('projects.nodeMenu.removeConfirm.title')}
      footer={footer}
    >
      <Text fontSize="sm" color="fg.muted" mb={4}>
        {t('projects.nodeMenu.removeConfirm.body', { name: node?.label ?? '' })}
      </Text>
      <Field.Root>
        <Field.Label fontSize="sm">
          {t('projects.nodeMenu.removeConfirm.typeLabel', {
            phrase: FLOW_NODE_REMOVE_CONFIRM_PHRASE,
          })}
        </Field.Label>
        <Input
          {...fieldStyles}
          autoComplete="off"
          autoFocus
          fontFamily="mono"
          placeholder={FLOW_NODE_REMOVE_CONFIRM_PHRASE}
          spellCheck={false}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Field.HelperText fontSize="xs">
          {t('projects.nodeMenu.removeConfirm.hint', { phrase: FLOW_NODE_REMOVE_CONFIRM_PHRASE })}
        </Field.HelperText>
      </Field.Root>
    </PanelDialog>
  )
}
