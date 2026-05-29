import { Box, HStack, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { projectPath } from '../../routes/route-config'
import type { ProjectSummary } from './project-sample-data'
import { ProjectCanvasEdges } from './ProjectCanvasEdges'
import { ProjectNodeVisual } from './ProjectNodeVisual'

function statusColor(online: number, total: number): string {
  if (total === 0) return 'gray.400'
  if (online >= total) return 'green.400'
  if (online > 0) return 'yellow.400'
  return 'red.400'
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const healthy = project.servicesOnline >= project.servicesTotal && project.servicesTotal > 0
  const previewScale = 1.15

  return (
    <Link to={projectPath(project.id)} style={{ textDecoration: 'none' }}>
      <Box
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-panel)"
        bg="bg.elevated"
        overflow="hidden"
        transition="border-color 0.15s, box-shadow 0.15s"
        _hover={{ borderColor: 'border.emphasized', boxShadow: 'md' }}
        h="full"
        display="flex"
        flexDirection="column"
      >
        <Box px={4} pt={3} pb={2}>
          <Text fontWeight="semibold" fontSize="sm">
            {project.name}
          </Text>
        </Box>

        <Box
          position="relative"
          mx={3}
          mb={3}
          flex={1}
          minH="120px"
          borderRadius="var(--radius-input)"
          bg="bg.panel"
          borderWidth="1px"
          borderColor="border.subtle"
          overflow="hidden"
          backgroundImage="radial-gradient(circle, var(--chakra-colors-border-subtle) 1px, transparent 1px)"
          backgroundSize="12px 12px"
        >
          <ProjectCanvasEdges
            nodes={project.previewNodes}
            edges={project.previewEdges}
            scale={previewScale}
            size="sm"
          />
          {project.previewNodes.map((node) => (
            <Box
              key={node.id}
              position="absolute"
              left={`${node.x}%`}
              top={`${node.y}%`}
              transform="translate(-50%, -50%)"
            >
              <ProjectNodeVisual kind={node.kind} label={node.label} size="sm" />
            </Box>
          ))}
        </Box>

        <HStack
          px={4}
          py={2.5}
          borderTopWidth="1px"
          borderColor="border.subtle"
          gap={2}
          fontSize="xs"
          color="fg.muted"
        >
          <Box
            w="6px"
            h="6px"
            borderRadius="full"
            bg={statusColor(project.servicesOnline, project.servicesTotal)}
            flexShrink={0}
          />
          <Text textTransform="lowercase">{project.environment}</Text>
          <Text color="fg.subtle">·</Text>
          <Text color={healthy ? 'fg.muted' : 'orange.300'}>
            {project.servicesOnline}/{project.servicesTotal}
          </Text>
        </HStack>
      </Box>
    </Link>
  )
}
