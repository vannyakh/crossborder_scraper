import {
  Button,
  Dialog,
  Field,
  Grid,
  HStack,
  IconButton,
  Input,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react'
import { RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreCatalogItem } from '../../lib/api'
import { fieldStyles } from '../ui/field-styles'
import { PanelSelect } from '../ui/PanelSelect'
import { DB_ACCESS_OPTIONS } from './database-access'
import { charsetOptionsForEngine } from './database-charset'
import {
  newDatabaseCreateDraft,
  randomDbPassword,
  randomDbUsername,
  type DatabaseCreateDraft,
} from './db-form-utils'

export type { DatabaseCreateDraft }

export function DatabaseAddDialog({
  open,
  loading,
  catalogItem,
  onClose,
  onConfirm,
}: {
  open: boolean
  loading: boolean
  catalogItem: StoreCatalogItem
  onClose: () => void
  onConfirm: (draft: DatabaseCreateDraft) => void | Promise<void>
}) {
  const { t } = useLocale()
  const accentPalette = useAccentPalette()
  const [draft, setDraft] = useState(() => newDatabaseCreateDraft(catalogItem.id))
  const [nameError, setNameError] = useState<string | null>(null)

  const charsetOptions = charsetOptionsForEngine(catalogItem.id)
  const accessOptions = useMemo(
    () => DB_ACCESS_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) })),
    [t],
  )

  useEffect(() => {
    if (!open) return
    setDraft(newDatabaseCreateDraft(catalogItem.id))
    setNameError(null)
  }, [open, catalogItem.id])

  function patch(partial: Partial<DatabaseCreateDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }))
  }

  function handleConfirm() {
    if (!draft.name.trim()) {
      setNameError(t('db.create.nameRequired'))
      return
    }
    setNameError(null)
    void onConfirm(draft)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(d) => !d.open && onClose()} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="md" borderRadius="var(--radius-panel)">
            <Dialog.Header>
              <Dialog.Title>{t('db.create.title')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap={4}>
                <Field.Root invalid={Boolean(nameError)}>
                  <Field.Label fontSize="sm">{t('db.create.dbName')}</Field.Label>
                  <Grid templateColumns="1fr 7.5rem" gap={2}>
                    <Input
                      size="sm"
                      {...fieldStyles}
                      placeholder={t('db.create.dbNamePlaceholder')}
                      value={draft.name}
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                    <PanelSelect
                      value={draft.charset}
                      options={charsetOptions}
                      minW="7.5rem"
                      zIndex={1400}
                      onChange={(charset) => patch({ charset })}
                    />
                  </Grid>
                  {nameError ? <Field.ErrorText>{nameError}</Field.ErrorText> : null}
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize="sm">{t('db.manage.username')}</Field.Label>
                  <HStack gap={1}>
                    <Input
                      size="sm"
                      {...fieldStyles}
                      fontFamily="mono"
                      value={draft.username}
                      onChange={(e) => patch({ username: e.target.value })}
                    />
                    <IconButton
                      size="sm"
                      variant="outline"
                      borderColor="border.subtle"
                      borderRadius="input"
                      aria-label={t('db.create.regenerate')}
                      onClick={() => patch({ username: randomDbUsername() })}
                    >
                      <RefreshCw size={14} />
                    </IconButton>
                  </HStack>
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize="sm">{t('db.manage.password')}</Field.Label>
                  <HStack gap={1}>
                    <Input
                      size="sm"
                      {...fieldStyles}
                      fontFamily="mono"
                      value={draft.password}
                      onChange={(e) => patch({ password: e.target.value })}
                    />
                    <IconButton
                      size="sm"
                      variant="outline"
                      borderColor="border.subtle"
                      borderRadius="input"
                      aria-label={t('db.create.regenerate')}
                      onClick={() => patch({ password: randomDbPassword() })}
                    >
                      <RefreshCw size={14} />
                    </IconButton>
                  </HStack>
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize="sm">{t('db.create.accessLabel')}</Field.Label>
                  <PanelSelect
                    value={draft.access}
                    options={accessOptions}
                    w="full"
                    minW="100%"
                    zIndex={1400}
                    onChange={(access) =>
                      patch({ access: access as DatabaseCreateDraft['access'] })
                    }
                  />
                </Field.Root>

                <BoxRules access={draft.access} t={t} />
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <HStack gap={2} justify="flex-end" w="full">
                <Button size="sm" variant="outline" borderColor="border.subtle" onClick={onClose}>
                  {t('db.create.cancel')}
                </Button>
                <Button
                  size="sm"
                  colorPalette={accentPalette}
                  borderRadius="input"
                  loading={loading}
                  onClick={handleConfirm}
                >
                  {t('db.create.confirm')}
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

function BoxRules({
  access,
  t,
}: {
  access: DatabaseCreateDraft['access']
  t: (key: string) => string
}) {
  const rules =
    access === 'remote'
      ? [t('db.create.ruleRemote1'), t('db.create.ruleRemote2')]
      : [t('db.create.ruleLocal1'), t('db.create.ruleLocal2')]

  return (
    <VStack
      align="stretch"
      gap={1}
      p={3}
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-input)"
      bg="bg.subtle"
    >
      <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
        {t('db.create.accessRulesTitle')}
      </Text>
      {rules.map((line) => (
        <Text key={line} fontSize="xs" color="fg.muted" lineHeight="tall">
          · {line}
        </Text>
      ))}
    </VStack>
  )
}
