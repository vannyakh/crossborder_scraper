import { Box, Button, Field, Flex, Input, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FadeIn } from '../components/motion/FadeIn'
import { fieldStyles } from '../components/ui/field-styles'
import { Panel, PanelBody } from '../components/ui/Panel'
import { ThemeSettingsButton } from '../components/theme/ThemeSettingsDrawer'
import { useAuth, useAuthStatusQuery } from '../hooks'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { connect, isConnecting, connectError } = useAuth()
  const { data: authStatus } = useAuthStatusQuery()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const apiOffline = Boolean((location.state as { apiOffline?: boolean } | null)?.apiOffline)

  async function handleConnect() {
    try {
      await connect({ username, password })
      void navigate(from, { replace: true })
    } catch {
      /* connectError */
    }
  }

  return (
    <Flex minH="100dvh" className="app-shell" align="center" justify="center" p={4}>
      <Box position="absolute" top={4} right={4}>
        <ThemeSettingsButton />
      </Box>

      <Box w="full" maxW="sm">
        <FadeIn>
        <VStack gap={6} mb={8} textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" color="brand.emphasis">
            Crossborder Scraper
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Sign in with panel credentials from <code className="text-xs">.env</code>
          </Text>
        </VStack>
        </FadeIn>

        <FadeIn delay={0.08}>
        <Panel>
          <PanelBody>
            {authStatus && !authStatus.auth_configured ? (
              <Box mb={4} p={3} fontSize="sm" color="fg.muted" borderRadius="input" bg="bg.input">
                Run <code className="text-xs">scraper setup</code> to generate credentials.
              </Box>
            ) : null}

            {apiOffline ? (
              <Box mb={4} p={3} fontSize="sm" color="orange.500" borderRadius="input" bg="bg.input">
                API offline — run <code className="text-xs">uv run serve</code>
              </Box>
            ) : null}

            <Field.Root>
              <Field.Label fontSize="xs" color="fg.muted">
                Username
              </Field.Label>
              <Input
                {...fieldStyles}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field.Root>

            <Field.Root mt={3}>
              <Field.Label fontSize="xs" color="fg.muted">
                Password
              </Field.Label>
              <Input
                {...fieldStyles}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field.Root>

            {connectError ? (
              <Text mt={3} fontSize="sm" color="red.500">
                {String((connectError as Error).message || connectError)}
              </Text>
            ) : null}

            <Button
              mt={5}
              w="full"
              colorPalette="blue"
              variant="solid"
              borderRadius="input"
              loading={isConnecting}
              disabled={!username || !password}
              onClick={() => void handleConnect()}
            >
              Sign in
            </Button>
          </PanelBody>
        </Panel>
        </FadeIn>
      </Box>
    </Flex>
  )
}
