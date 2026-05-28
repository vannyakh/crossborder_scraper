import { Button, Link, Text, VStack } from '@chakra-ui/react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { Toolbar } from '../components/layout/Toolbar'
import { Panel, PanelBody } from '../components/ui/Panel'
import { ROUTE_PATHS } from '../routes/route-config'

export function NotFoundPage() {
  const { pathname } = useLocation()

  return (
    <>
      <Toolbar title="404" description="Page not found" />
      <Panel>
        <PanelBody textAlign="center" py={10}>
          <VStack gap={3}>
            <Text fontSize="4xl" fontWeight="bold" color="fg.muted">
              404
            </Text>
            <Text fontSize="sm" color="fg.muted" maxW="md">
              No panel page exists at{' '}
              <Text as="span" fontFamily="mono" color="fg">
                {pathname}
              </Text>
              . Check the URL or return to the dashboard.
            </Text>
            <Link asChild mt={2} display="inline-block">
              <RouterLink to={ROUTE_PATHS.home}>
                <Button colorPalette="blue" size="sm" borderRadius="input">
                  Back to home
                </Button>
              </RouterLink>
            </Link>
          </VStack>
        </PanelBody>
      </Panel>
    </>
  )
}
