import { Box, HStack } from '@chakra-ui/react'
import logoSvg from '../../../public/images/logo.svg?raw'

export function ShellLogoMark({ collapsed, label }: { collapsed: boolean; label: string }) {
  return (
    <HStack
      gap={2}
      minW={0}
      justify={collapsed ? 'center' : 'flex-start'}
      w={collapsed ? 'full' : 'auto'}
    >
      <Box
        className="shell-logo-mark"
        role="img"
        aria-label={label}
        dangerouslySetInnerHTML={{ __html: logoSvg }}
      />
    </HStack>
  )
}
