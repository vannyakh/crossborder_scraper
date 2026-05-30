import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { Terminal } from 'lucide-react'
import { useMemo } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { formatFlowConsoleTime } from './project-flow-console'
import { useFlowConsoleOptional } from './use-flow-console'
import type { ProjectNode } from './project-sample-data'

export function ProjectNodeConfigOutput({ node }: { node: ProjectNode }) {
  const { t } = useLocale()
  const consoleState = useFlowConsoleOptional()

  const lines = useMemo(() => {
    if (!consoleState) return []
    return consoleState.linesForNode(node.id)
  }, [consoleState, node.id])

  const openConsole = () => {
    if (!consoleState) return
    consoleState.expandConsole()
    consoleState.setFilterNodeId(node.id)
  }

  if (!consoleState) {
    return (
      <Text fontSize="sm" color="fg.muted" py={4}>
        {t('projects.flowConsole.outputUnavailable')}
      </Text>
    )
  }

  return (
    <Box className="project-config-output">
      <HStack justify="space-between" mb={3} gap={2}>
        <HStack gap={2}>
          <Terminal size={16} />
          <Text fontSize="sm" fontWeight="medium">
            {t('projects.flowConsole.outputTitle')}
          </Text>
        </HStack>
        <Button size="xs" variant="outline" onClick={openConsole}>
          {t('projects.flowConsole.openFull')}
        </Button>
      </HStack>

      {lines.length === 0 ? (
        <Box className="project-config-output__empty">
          <Text fontSize="sm" color="fg.muted">
            {t('projects.flowConsole.outputEmpty')}
          </Text>
          <Text fontSize="xs" color="fg.subtle" mt={1}>
            {t('projects.flowConsole.outputEmptyHint')}
          </Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={0} className="project-config-output__lines app-scroll">
          {lines.map((line) => (
            <HStack
              key={line.id}
              className={`project-config-output__line project-config-output__line--${line.level}`}
              align="flex-start"
              gap={2}
              py={1.5}
            >
              <Text fontFamily="mono" fontSize="xs" color="fg.muted" whiteSpace="nowrap">
                {formatFlowConsoleTime(line.at)}
              </Text>
              <Text fontSize="xs" flex={1} wordBreak="break-word">
                {line.message}
              </Text>
            </HStack>
          ))}
        </VStack>
      )}
    </Box>
  )
}
