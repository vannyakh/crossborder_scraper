import { Button, Field, Grid, HStack, IconButton, Input, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Panel, PanelBody, PanelHeader } from '../ui/Panel'
import { fieldStyles } from '../ui/field-styles'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { StoreCatalogItem, StoreConnectRequest } from '../../lib/api'
import { pluginIcon } from './store-utils'

function ConnectField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Field.Root>
      <Field.Label fontSize="xs" color="fg.muted">
        {label}
      </Field.Label>
      {children}
    </Field.Root>
  )
}

export function StoreConnectForm({
  item,
  form,
  loading,
  onChange,
  onSubmit,
  onClose,
}: {
  item: StoreCatalogItem
  form: StoreConnectRequest
  loading: boolean
  onChange: (next: StoreConnectRequest) => void
  onSubmit: () => void
  onClose: () => void
}) {
  const accentPalette = useAccentPalette()
  const Icon = pluginIcon(item.id)
  const fields = item.connection_fields

  return (
    <Panel mb={4}>
      <PanelHeader
        title={`Connect ${item.name}`}
        description="Use an existing instance on this host or another server"
        action={
          <IconButton
            aria-label="Close"
            size="sm"
            variant="ghost"
            borderRadius="var(--radius-input)"
            onClick={onClose}
          >
            <X size={16} />
          </IconButton>
        }
      />
      <PanelBody>
        <HStack gap={2} mb={4} color="fg.muted">
          <Icon size={18} />
          <Text fontSize="sm">Default port {item.default_port}</Text>
        </HStack>

        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3}>
          <ConnectField label="Host">
            <Input
              size="sm"
              {...fieldStyles}
              value={form.host ?? ''}
              onChange={(e) => onChange({ ...form, host: e.target.value })}
            />
          </ConnectField>
          <ConnectField label="Port">
            <Input
              size="sm"
              type="number"
              {...fieldStyles}
              value={form.port ?? item.default_port}
              onChange={(e) => onChange({ ...form, port: Number(e.target.value) })}
            />
          </ConnectField>
          {fields.some((f) => f.key === 'username') ? (
            <ConnectField label="Username">
              <Input
                size="sm"
                {...fieldStyles}
                value={form.username ?? ''}
                onChange={(e) => onChange({ ...form, username: e.target.value })}
              />
            </ConnectField>
          ) : null}
          {fields.some((f) => f.key === 'password') ? (
            <ConnectField label="Password">
              <Input
                size="sm"
                type="password"
                {...fieldStyles}
                value={form.password ?? ''}
                onChange={(e) => onChange({ ...form, password: e.target.value })}
              />
            </ConnectField>
          ) : null}
          {fields.some((f) => f.key === 'database') ? (
            <ConnectField label="Database">
              <Input
                size="sm"
                {...fieldStyles}
                value={form.database ?? ''}
                onChange={(e) => onChange({ ...form, database: e.target.value })}
              />
            </ConnectField>
          ) : null}
        </Grid>

        <HStack mt={4} gap={2} justify="flex-end">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            colorPalette={accentPalette}
            borderRadius="var(--radius-input)"
            loading={loading}
            onClick={onSubmit}
          >
            Save connection
          </Button>
        </HStack>
      </PanelBody>
    </Panel>
  )
}
