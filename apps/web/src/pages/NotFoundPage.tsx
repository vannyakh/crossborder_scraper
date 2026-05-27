import { Button, Link, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { Toolbar } from '../components/layout/Toolbar'
import { Panel, PanelBody } from '../components/ui/Panel'

export function NotFoundPage() {
  return (
    <>
      <Toolbar title="404" description="Page not found" />
      <Panel>
        <PanelBody textAlign="center" py={10}>
          <Text fontSize="4xl" fontWeight="bold" color="fg.muted">
            404
          </Text>
          <Link asChild mt={6} display="inline-block">
            <RouterLink to="/">
              <Button colorPalette="blue" size="sm" borderRadius="input">
                Back to home
              </Button>
            </RouterLink>
          </Link>
        </PanelBody>
      </Panel>
    </>
  )
}
