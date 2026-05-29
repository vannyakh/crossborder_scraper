import { VStack } from '@chakra-ui/react'
import { NavLink, useLocation, useParams } from 'react-router-dom'
import { PROJECT_SHELL_NAV } from '../../projects/project-sections'
import { useLocale } from '../../../hooks/use-locale'
import { projectSectionPath } from '../../../routes/route-config'
import { SidebarCollapsedHover, SidebarCollapsedLabelTip } from '../SidebarCollapsedHover'
import { SidebarNavItem } from '../SidebarNavItem'

export function ProjectShellNav() {
  const { projectId } = useParams<{ projectId: string }>()
  const location = useLocation()
  const { t } = useLocale()

  if (!projectId) return null

  return (
    <VStack align="stretch" gap={1} flex={1} justify="center" w="full" py={2}>
      {PROJECT_SHELL_NAV.map((item) => {
        const to = projectSectionPath(projectId, item.id)
        const active = location.pathname === to

        return (
          <SidebarCollapsedHover
            key={item.id}
            label={t(item.labelKey)}
            active={active}
            variant="tip"
            content={<SidebarCollapsedLabelTip label={t(item.labelKey)} />}
          >
            <NavLink
              to={to}
              style={{
                textDecoration: 'none',
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <SidebarNavItem active={active} collapsed label={t(item.labelKey)} icon={item.icon} />
            </NavLink>
          </SidebarCollapsedHover>
        )
      })}
    </VStack>
  )
}
