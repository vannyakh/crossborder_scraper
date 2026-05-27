import {
  Box,
  Button,
  Dialog,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Portal,
  Separator,
  Switch,
  Tabs,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { Download, Plus, RefreshCw, Shield, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useCreateFirewallRuleMutation,
  useDeleteFirewallRuleMutation,
  useExportFirewallRulesQuery,
  useFirewallGroupsQuery,
  useFirewallIcmpMutation,
  useFirewallRulesQuery,
  useFirewallStatusQuery,
  useFirewallToggleMutation,
  useImportFirewallRulesMutation,
  useInstallUfwMutation,
  useUpsertFirewallGroupMutation,
} from '../../hooks/queries/use-firewall-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { FirewallRule } from '../../lib/api'
import { settingsPath } from '../../routes/route-config'
import { Toolbar } from '../layout/Toolbar'
import { DataListEmpty } from '../ui/DataList'
import { SectionCard } from '../ui/Section'
import { StatusBadge } from '../ui/StatusBadge'

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <Box
      p={3}
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="var(--radius-card)"
      bg="bg.panelHover"
      minW="100px"
    >
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="lg" fontWeight="semibold" mt={0.5}>
        {value}
      </Text>
    </Box>
  )
}

function AddRuleDialog({
  open,
  onClose,
  groups,
}: {
  open: boolean
  onClose: () => void
  groups: { id: string; label: string }[]
}) {
  const accentPalette = useAccentPalette()
  const createMutation = useCreateFirewallRuleMutation()
  const [protocol, setProtocol] = useState<'tcp' | 'udp' | 'any'>('tcp')
  const [port, setPort] = useState('')
  const [source, setSource] = useState('0.0.0.0/0')
  const [action, setAction] = useState<'allow' | 'deny'>('allow')
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound')
  const [remark, setRemark] = useState('')
  const [groupId, setGroupId] = useState('')

  async function submit() {
    await createMutation.mutateAsync({
      protocol,
      port: port.trim(),
      source: source.trim() || '0.0.0.0/0',
      action,
      direction,
      remark: remark.trim(),
      group_id: groupId || null,
    })
    onClose()
    setPort('')
    setRemark('')
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner display="flex" alignItems="center" justifyContent="center" p={4}>
          <Dialog.Content maxW="520px" w="full" bg="bg.elevated">
            <Dialog.Header borderBottomWidth="1px" borderColor="border.subtle">
              <Dialog.Title fontWeight="semibold">Add port rule</Dialog.Title>
              <Dialog.Description fontSize="sm" color="fg.muted" mt={1}>
                Supports single ports (80), lists (80,443), and ranges (39000-40000).
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body py={4}>
              <Grid templateColumns="1fr 1fr" gap={3}>
                <Field.Root>
                  <Field.Label>Protocol</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={protocol}
                      onChange={(e) => setProtocol(e.target.value as typeof protocol)}
                    >
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                      <option value="any">Any</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Port</Field.Label>
                  <Input value={port} placeholder="22 or 80,443 or 39000-40000" onChange={(e) => setPort(e.target.value)} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Source IP</Field.Label>
                  <Input value={source} onChange={(e) => setSource(e.target.value)} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Strategy</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={action}
                      onChange={(e) => setAction(e.target.value as typeof action)}
                    >
                      <option value="allow">Allow</option>
                      <option value="deny">Deny</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Direction</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={direction}
                      onChange={(e) => setDirection(e.target.value as typeof direction)}
                    >
                      <option value="inbound">Inbound</option>
                      <option value="outbound">Outbound</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Group</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                      <option value="">None</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root gridColumn="1 / -1">
                  <Field.Label>Remarks</Field.Label>
                  <Input value={remark} placeholder="SSH remote service" onChange={(e) => setRemark(e.target.value)} />
                </Field.Root>
              </Grid>
              {createMutation.error ? (
                <Text mt={2} fontSize="sm" color="red.500">
                  {String((createMutation.error as Error).message)}
                </Text>
              ) : null}
            </Dialog.Body>
            <Dialog.Footer borderTopWidth="1px" borderColor="border.subtle" gap={2}>
              <Button variant="outline" borderColor="border.subtle" onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorPalette={accentPalette}
                loading={createMutation.isPending}
                disabled={!port.trim()}
                onClick={() => void submit()}
              >
                Confirm
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

function RuleRow({
  rule,
  busy,
  onDelete,
}: {
  rule: FirewallRule
  busy: boolean
  onDelete: (id: string) => void
}) {
  return (
    <Box px={4} py={3} borderBottomWidth="1px" borderColor="border.subtle">
      <Grid templateColumns={{ base: '1fr', lg: '80px 100px 1fr 100px 100px 120px auto' }} gap={2} alignItems="center">
        <Text fontSize="sm" fontFamily="mono">
          {rule.protocol}
        </Text>
        <Text fontSize="sm" fontFamily="mono" fontWeight="medium">
          {rule.port}
        </Text>
        <Box minW={0}>
          <Text fontSize="sm" lineClamp={1}>
            {rule.remark || '—'}
          </Text>
          {rule.group_label ? (
            <Text fontSize="xs" color="fg.muted">
              {rule.group_label}
            </Text>
          ) : null}
        </Box>
        <StatusBadge
          status={rule.listening ? 'success' : rule.listening === false ? 'neutral' : 'running'}
          label={rule.status_label}
        />
        <StatusBadge status={rule.action === 'allow' ? 'success' : 'danger'} label={rule.strategy} />
        <Text fontSize="xs" color="fg.muted" lineClamp={1}>
          {rule.source} · {rule.direction}
        </Text>
        <Button
          size="xs"
          variant="outline"
          colorPalette="red"
          borderColor="border.subtle"
          disabled={busy}
          onClick={() => onDelete(rule.id)}
        >
          Delete
        </Button>
      </Grid>
    </Box>
  )
}

export function FirewallPanels() {
  const accentPalette = useAccentPalette()
  const statusQuery = useFirewallStatusQuery()
  const rulesQuery = useFirewallRulesQuery()
  const groupsQuery = useFirewallGroupsQuery()
  const toggleMutation = useFirewallToggleMutation()
  const icmpMutation = useFirewallIcmpMutation()
  const installMutation = useInstallUfwMutation()
  const deleteMutation = useDeleteFirewallRuleMutation()
  const importMutation = useImportFirewallRulesMutation()
  const upsertGroupMutation = useUpsertFirewallGroupMutation()

  const [tab, setTab] = useState<'rules' | 'groups'>('rules')
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const exportQuery = useExportFirewallRulesQuery(exportOpen)

  const status = statusQuery.data
  const groups = groupsQuery.data?.items ?? []

  const filteredRules = useMemo(() => {
    let items = rulesQuery.data?.items ?? []
    if (directionFilter !== 'all') {
      items = items.filter((r) => r.direction === directionFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      items = items.filter(
        (r) =>
          r.port.toLowerCase().includes(q) ||
          r.remark.toLowerCase().includes(q) ||
          r.source.toLowerCase().includes(q),
      )
    }
    return items
  }, [rulesQuery.data?.items, directionFilter, search])

  const busy =
    toggleMutation.isPending ||
    icmpMutation.isPending ||
    installMutation.isPending ||
    deleteMutation.isPending

  async function handleExportDownload() {
    setExportOpen(true)
    const data = exportQuery.data ?? (await exportQuery.refetch()).data
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'crossborder-firewall-rules.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Toolbar
        title="Host firewall"
        description="UFW port rules, groups, and VPS access — complements cloud security group settings"
        actions={
          <HStack gap={2}>
            <Button size="sm" variant="outline" borderColor="border.subtle" asChild>
              <Link to={settingsPath('network')}>Panel security</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              loading={statusQuery.isFetching}
              onClick={() => {
                void statusQuery.refetch()
                void rulesQuery.refetch()
              }}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
          </HStack>
        }
      />

      {!status?.installed ? (
        <SectionCard mb={4} p={4} borderColor="orange.500">
          <HStack justify="space-between" flexWrap="wrap" gap={3}>
            <Text fontSize="sm">UFW is not installed on this host. Install it to manage port rules from the panel.</Text>
            <Button
              size="sm"
              colorPalette={accentPalette}
              loading={installMutation.isPending}
              onClick={() => void installMutation.mutateAsync()}
            >
              Install UFW
            </Button>
          </HStack>
        </SectionCard>
      ) : null}

      <SectionCard mb={4} p={4}>
        <HStack justify="space-between" flexWrap="wrap" gap={4} mb={4}>
          <HStack gap={2}>
            <Shield size={18} />
            <Text fontWeight="semibold">Firewall</Text>
            <StatusBadge
              status={status?.active ? 'success' : 'danger'}
              label={status?.active ? 'active' : 'stopped'}
            />
          </HStack>
          <HStack gap={4} flexWrap="wrap">
            <HStack gap={2}>
              <Text fontSize="sm">Turn on firewall</Text>
              <Switch.Root
                checked={Boolean(status?.active)}
                disabled={!status?.can_manage || busy}
                colorPalette={accentPalette}
                onCheckedChange={(e) => void toggleMutation.mutateAsync(e.checked)}
              >
                <Switch.HiddenInput />
                <Switch.Control />
              </Switch.Root>
            </HStack>
            <HStack gap={2}>
              <Text fontSize="sm">Block ICMP</Text>
              <Switch.Root
                checked={Boolean(status?.block_icmp || status?.icmp_blocked)}
                disabled={!status?.can_manage || busy}
                colorPalette={accentPalette}
                onCheckedChange={(e) => void icmpMutation.mutateAsync(e.checked)}
              >
                <Switch.HiddenInput />
                <Switch.Control />
              </Switch.Root>
            </HStack>
          </HStack>
        </HStack>

        <HStack gap={2} flexWrap="wrap" mb={2}>
          <StatBox label="Port rules" value={status?.port_rule_count ?? 0} />
          <StatBox label="IP rules" value={status?.ip_rule_count ?? 0} />
          <StatBox label="Groups" value={status?.group_count ?? 0} />
          <StatBox label="Inbound" value={status?.inbound_rule_count ?? 0} />
          <StatBox label="Outbound" value={status?.outbound_rule_count ?? 0} />
        </HStack>

        <Text fontSize="xs" color="fg.muted">
          {status?.summary || 'ufw status unavailable'} · requires root or passwordless sudo to apply changes
        </Text>
      </SectionCard>

      <Tabs.Root value={tab} onValueChange={(d) => setTab((d.value as typeof tab) ?? 'rules')} variant="line" size="sm">
        <Tabs.List mb={3}>
          <Tabs.Trigger value="rules">Port rules</Tabs.Trigger>
          <Tabs.Trigger value="groups">UFW groups</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="rules" pt={0}>
          <HStack mb={3} gap={2} flexWrap="wrap" justify="space-between">
            <HStack gap={2} flexWrap="wrap">
              <Button size="sm" colorPalette={accentPalette} onClick={() => setAddOpen(true)}>
                <Plus size={14} />
                Add port rule
              </Button>
              <Button size="sm" variant="outline" borderColor="border.subtle" onClick={() => void handleExportDownload()}>
                <Download size={14} />
                Export
              </Button>
              <Button size="sm" variant="outline" borderColor="border.subtle" onClick={() => fileRef.current?.click()}>
                <Upload size={14} />
                Import
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  void f.text().then((text) => {
                    const payload = JSON.parse(text) as import('../../lib/api').FirewallExport
                    void importMutation.mutateAsync(payload)
                  })
                  e.target.value = ''
                }}
              />
            </HStack>
            <HStack gap={2}>
              <ButtonGroupFilter value={directionFilter} onChange={setDirectionFilter} accent={accentPalette} />
              <Input
                size="sm"
                w="180px"
                placeholder="Search port…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </HStack>
          </HStack>

          <SectionCard p={0} overflow="hidden">
            <Box px={4} py={2} bg="bg.panelHover" display={{ base: 'none', lg: 'grid' }} gridTemplateColumns="80px 100px 1fr 100px 100px 120px auto" gap={2}>
              <Text fontSize="xs" color="fg.muted">Protocol</Text>
              <Text fontSize="xs" color="fg.muted">Port</Text>
              <Text fontSize="xs" color="fg.muted">Remarks</Text>
              <Text fontSize="xs" color="fg.muted">Status</Text>
              <Text fontSize="xs" color="fg.muted">Strategy</Text>
              <Text fontSize="xs" color="fg.muted">Source</Text>
              <Text fontSize="xs" color="fg.muted"> </Text>
            </Box>
            <Separator borderColor="border.subtle" />
            {filteredRules.length === 0 ? (
              <Box p={6}>
                <DataListEmpty>No port rules match your filters.</DataListEmpty>
              </Box>
            ) : (
              filteredRules.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  busy={deleteMutation.isPending}
                  onDelete={(id) => void deleteMutation.mutateAsync(id)}
                />
              ))
            )}
          </SectionCard>
        </Tabs.Content>

        <Tabs.Content value="groups" pt={0}>
          <GroupsPanel
            groups={groups}
            busy={upsertGroupMutation.isPending}
            onCreate={(payload) => void upsertGroupMutation.mutateAsync(payload)}
          />
        </Tabs.Content>
      </Tabs.Root>

      <AddRuleDialog open={addOpen} onClose={() => setAddOpen(false)} groups={groups} />
    </>
  )
}

function ButtonGroupFilter({
  value,
  onChange,
  accent,
}: {
  value: 'all' | 'inbound' | 'outbound'
  onChange: (v: 'all' | 'inbound' | 'outbound') => void
  accent: string
}) {
  const opts: { id: typeof value; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'inbound', label: 'Inbound' },
    { id: 'outbound', label: 'Outbound' },
  ]
  return (
    <HStack gap={1}>
      {opts.map((o) => (
        <Button
          key={o.id}
          size="xs"
          variant={value === o.id ? 'solid' : 'outline'}
          colorPalette={value === o.id ? accent : 'gray'}
          borderColor="border.subtle"
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </Button>
      ))}
    </HStack>
  )
}

function GroupsPanel({
  groups,
  busy,
  onCreate,
}: {
  groups: { id: string; label: string; description: string; rule_count?: number }[]
  busy: boolean
  onCreate: (payload: { id: string; label: string; description?: string }) => void
}) {
  const [id, setId] = useState('')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')

  return (
    <Box>
      <SectionCard mb={4} p={4}>
        <Text fontWeight="semibold" mb={3}>
          Create group
        </Text>
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 2fr auto' }} gap={2}>
          <Input size="sm" placeholder="id (panel)" value={id} onChange={(e) => setId(e.target.value)} />
          <Input size="sm" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input size="sm" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button
            size="sm"
            disabled={!id.trim() || !label.trim() || busy}
            onClick={() => {
              onCreate({ id: id.trim(), label: label.trim(), description: description.trim() })
              setId('')
              setLabel('')
              setDescription('')
            }}
          >
            Add group
          </Button>
        </Grid>
      </SectionCard>

      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={3}>
        {groups.map((g) => (
          <SectionCard key={g.id} p={4}>
            <Text fontWeight="semibold">{g.label}</Text>
            <Text fontSize="xs" color="fg.muted" fontFamily="mono" mt={0.5}>
              {g.id}
            </Text>
            <Text fontSize="sm" color="fg.muted" mt={2}>
              {g.description || 'No description'}
            </Text>
            <Text fontSize="xs" color="fg.subtle" mt={2}>
              {g.rule_count ?? 0} rules
            </Text>
          </SectionCard>
        ))}
      </Grid>
    </Box>
  )
}
