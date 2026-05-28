import { Breadcrumb, HStack } from '@chakra-ui/react'
import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useBreadcrumbTrail } from '../../hooks/use-breadcrumb-trail'

export function AppBreadcrumb() {
  const items = useBreadcrumbTrail()

  return (
    <Breadcrumb.Root size="sm" flex="1" minW={0} display={{ base: 'none', md: 'flex' }}>
      <Breadcrumb.List flexWrap="nowrap" overflow="hidden">
        {items.map((item, index) => {
          const last = index === items.length - 1
          const Icon = item.icon

          const label = (
            <HStack as="span" gap={1.5} minW={0} display="inline-flex" align="center">
              {Icon ? <Icon size={14} strokeWidth={2} aria-hidden /> : null}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            </HStack>
          )

          return (
            <Fragment key={`${item.label}-${index}`}>
              <Breadcrumb.Item minW={0}>
                {last || !item.to ? (
                  <Breadcrumb.CurrentLink minW={0}>{label}</Breadcrumb.CurrentLink>
                ) : (
                  <Breadcrumb.Link asChild minW={0}>
                    <Link to={item.to}>{label}</Link>
                  </Breadcrumb.Link>
                )}
              </Breadcrumb.Item>
              {!last ? (
                <Breadcrumb.Separator color="fg.muted">
                  <ChevronRight size={14} strokeWidth={2} aria-hidden />
                </Breadcrumb.Separator>
              ) : null}
            </Fragment>
          )
        })}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  )
}
