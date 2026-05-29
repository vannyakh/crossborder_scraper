import { Box, HStack } from '@chakra-ui/react'
import logoSvg from '../../../public/images/logo.svg?raw'
import { useThemeStore } from '../../stores/theme-store'

export function ShellLogoMark({
  collapsed,
  layout = 'sidebar',
  label,
  onClick,
  buttonTitle,
}: {
  collapsed: boolean
  /** `sidebar` centers in collapsed rail; `header` stays left-aligned in top bars */
  layout?: 'sidebar' | 'header'
  label: string
  onClick?: () => void
  /** Native title on the logo button; defaults to copy-URL hint in the main shell */
  buttonTitle?: string
}) {
  const sidebarCompact = collapsed && layout === 'sidebar'
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
      justify={sidebarCompact ? 'center' : 'flex-start'}
      w={sidebarCompact ? 'full' : 'auto'}
      flexShrink={0}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          title={buttonTitle ?? 'Copy panel URL'}
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
