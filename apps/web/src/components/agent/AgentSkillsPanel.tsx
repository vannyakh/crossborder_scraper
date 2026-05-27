import {
  Badge,
  Box,
  Button,
  HStack,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { RefreshCw, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { DataListEmpty } from '../ui/DataList'
import { SectionCard } from '../ui/Section'
import {
  useGatewaySkillsQuery,
  useInstallSkillMutation,
  useSetEnabledSkillsMutation,
} from '../../hooks/queries/use-agent-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import type { GatewaySkill } from '../../lib/api'

function SkillRow({
  skill,
  busy,
  onToggle,
}: {
  skill: GatewaySkill
  busy: boolean
  onToggle: (id: string, enabled: boolean) => void
}) {
  return (
    <Box
      py={3}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      _last={{ borderBottomWidth: 0 }}
    >
      <HStack justify="space-between" align="start" gap={3}>
        <Box minW={0} flex={1}>
          <HStack gap={2} flexWrap="wrap">
            <Text fontSize="lg" aria-hidden>
              {skill.emoji}
            </Text>
            <Text fontWeight="semibold">{skill.name}</Text>
            <Badge size="sm" variant="subtle" textTransform="none">
              {skill.kind}
            </Badge>
            <Badge size="sm" variant="outline" textTransform="none">
              {skill.category}
            </Badge>
          </HStack>
          <Text fontSize="sm" color="fg.muted" mt={1} lineHeight="tall">
            {skill.description}
          </Text>
          {skill.tools.length > 0 ? (
            <HStack mt={2} gap={1} flexWrap="wrap">
              {skill.tools.map((t) => (
                <Badge key={t} size="sm" variant="subtle" fontFamily="mono" textTransform="none">
                  {t}
                </Badge>
              ))}
            </HStack>
          ) : null}
        </Box>
        <Switch.Root
          checked={skill.enabled}
          disabled={busy}
          onCheckedChange={(e) => onToggle(skill.id, !!e.checked)}
          colorPalette="green"
        >
          <Switch.HiddenInput />
          <Switch.Control />
        </Switch.Root>
      </HStack>
    </Box>
  )
}

export function AgentSkillsPanel() {
  const accentPalette = useAccentPalette()
  const fileRef = useRef<HTMLInputElement>(null)
  const [installing, setInstalling] = useState(false)

  const skillsQuery = useGatewaySkillsQuery()
  const setEnabledMutation = useSetEnabledSkillsMutation()
  const installMutation = useInstallSkillMutation()

  const items = skillsQuery.data?.items ?? []
  const enabled = skillsQuery.data?.enabled ?? []
  const busy = setEnabledMutation.isPending || installMutation.isPending || installing

  async function handleToggle(skillId: string, on: boolean) {
    const next = new Set(enabled)
    if (on) next.add(skillId)
    else next.delete(skillId)
    await setEnabledMutation.mutateAsync([...next])
  }

  async function handleUpload(file: File) {
    setInstalling(true)
    try {
      await installMutation.mutateAsync({ file, replace: false })
    } finally {
      setInstalling(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <VStack align="stretch" gap={4} p={4} maxW="900px" mx="auto" w="full">
      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Text fontSize="lg" fontWeight="semibold">
            Agent skills
          </Text>
          <Text fontSize="sm" color="fg.muted">
            SKILL.md packages — instructions + tool scope for the gateway agent.
          </Text>
        </Box>
        <HStack gap={2}>
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            loading={skillsQuery.isFetching}
            onClick={() => void skillsQuery.refetch()}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
          <Button
            size="sm"
            colorPalette={accentPalette}
            loading={installing}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={14} />
            Install ZIP
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleUpload(f)
            }}
          />
        </HStack>
      </HStack>

      <SectionCard>
        <Text fontSize="sm" color="fg.muted" mb={3}>
          {enabled.length} enabled · built-in skills live in <code>skills/</code> · custom in{' '}
          <code>installed_skills/</code>
        </Text>
        {skillsQuery.isLoading ? (
          <DataListEmpty>Loading skills…</DataListEmpty>
        ) : items.length === 0 ? (
          <DataListEmpty>No skills found. Add folders under skills/ with SKILL.md.</DataListEmpty>
        ) : (
          items.map((skill) => (
            <SkillRow key={skill.id} skill={skill} busy={busy} onToggle={handleToggle} />
          ))
        )}
      </SectionCard>
    </VStack>
  )
}
