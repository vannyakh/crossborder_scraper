import { Box } from '@chakra-ui/react'
import { ProjectFlowCanvas } from './ProjectFlowCanvas'

/** Full-viewport project flow overview (React Flow). */
export function ProjectCanvasPanel() {
  return (
    <Box
      className="project-canvas-panel"
      flex={1}
      minH={0}
      h="100%"
      w="100%"
      display="flex"
      flexDirection="column"
    >
      <ProjectFlowCanvas />
    </Box>
  )
}
