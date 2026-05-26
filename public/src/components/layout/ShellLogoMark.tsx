import { Box, HStack } from '@chakra-ui/react'
import logoSvg from '../../../public/images/logo.svg?raw'
import { useThemeStore } from '../../stores/theme-store'

export function ShellLogoMark({
  collapsed,
  label,
  onClick,
}: {
  collapsed: boolean
  label: string
  onClick?: () => void
}) {
  const logoUrl = useThemeStore((s) => s.config.branding.logoUrl)

  const mark = logoUrl ? (
    <Box className="shell-logo-mark shell-logo-mark--image" role="img" aria-label={label}>
      <img src={logoUrl} alt="" />
    </Box>
  ) : (
    <Box
      className="shell-logo-mark"
      role={onClick ? undefined : 'img'}
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: logoSvg }}
    />
  )

  return (
    <HStack
      gap={2}
      minW={0}
      justify={collapsed ? 'center' : 'flex-start'}
      w={collapsed ? 'full' : 'auto'}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          title="Copy panel URL"
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            lineHeight: 0,
          }}
        >
          {mark}
        </button>
      ) : (
        mark
      )}
    </HStack>
  )
}
