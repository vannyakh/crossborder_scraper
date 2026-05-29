import { Flex } from '@chakra-ui/react'
import { AccountMenu } from '../AccountMenu'
import { ShellFooter, ShellScrollArea } from '../ShellChrome'
import { PROJECT_SHELL_SIDEBAR_WIDTH } from './constants'
import { ProjectShellNav } from './ProjectShellNav'

export function ProjectShellSidebar() {
  return (
    <Flex
      as="aside"
      className="project-shell-sidebar"
      direction="column"
      flexShrink={0}
      w={`${PROJECT_SHELL_SIDEBAR_WIDTH}px`}
      h="full"
      alignSelf="stretch"
      borderRightWidth="1px"
      borderColor="border.subtle"
      bg="bg.sidebar"
      overflow="hidden"
    >
      <ShellScrollArea flex={1} px={1} display="flex" flexDirection="column">
        <ProjectShellNav />
      </ShellScrollArea>

      <ShellFooter py={2} display="flex" justifyContent="center">
        <AccountMenu iconOnly />
      </ShellFooter>
    </Flex>
  )
}
