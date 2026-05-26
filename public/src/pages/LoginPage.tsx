import { Box, Button, Field, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FadeIn } from '../components/motion/FadeIn'
import { fieldStyles } from '../components/ui/field-styles'
import { Panel, PanelBody } from '../components/ui/Panel'
import { ThemeToggle } from '../components/ui/ThemeToggle'
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
      // error surfaced via connectError
    }
  }

  return (
    <VStack minH="100dvh" justify="center" px={4} className="app-mesh" gap={4}>
      <HStack w="full" maxW="md" justify="flex-end">
        <ThemeToggle />
      </HStack>

      <FadeIn className="w-full max-w-md">
        <motion.div
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <Panel>
            <PanelBody>
              <Text fontFamily="heading" fontSize="xl" fontWeight="extrabold" className="brand-gradient-text">
                Panel sign in
              </Text>
              <Text mt={2} fontSize="sm" color="fg.muted">
                Use the username and password from your{' '}
                <Box as="code" fontFamily="mono" fontSize="xs" color="fg">
                  .env
                </Box>{' '}
                file (
                <Box as="code" fontFamily="mono" fontSize="xs" color="fg">
                  PANEL_USERNAME
                </Box>
                ,{' '}
                <Box as="code" fontFamily="mono" fontSize="xs" color="fg">
                  PANEL_PASSWORD
                </Box>
                ).
              </Text>

              {authStatus && !authStatus.auth_configured ? (
                <Text
                  mt={3}
                  fontSize="sm"
                  color="orange.500"
                  p={3}
                  borderRadius="input"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  bg="bg.elevated"
                >
                  Credentials not configured yet. Run{' '}
                  <Box as="code" fontFamily="mono" fontSize="xs">
                    scraper setup
                  </Box>{' '}
                  or start the server once to auto-generate them in .env.
                </Text>
              ) : null}

              {apiOffline ? (
                <Text
                  mt={3}
                  fontSize="sm"
                  color="orange.500"
                  p={3}
                  borderRadius="input"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  bg="bg.elevated"
                >
                  API offline. Start with{' '}
                  <Box as="code" fontFamily="mono" fontSize="xs">
                    uv run serve
                  </Box>
                </Text>
              ) : null}

              <Field.Root mt={5}>
                <Field.Label color="fg.muted" fontSize="xs">
                  Username
                </Field.Label>
                <Input
                  {...fieldStyles}
                  autoComplete="username"
                  placeholder="PANEL_USERNAME from .env"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field.Root>

              <Field.Root mt={3}>
                <Field.Label color="fg.muted" fontSize="xs">
                  Password
                </Field.Label>
                <Input
                  {...fieldStyles}
                  type="password"
                  autoComplete="current-password"
                  placeholder="PANEL_PASSWORD from .env"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field.Root>

              {connectError ? (
                <Text
                  mt={3}
                  fontSize="sm"
                  color="red.500"
                  p={3}
                  borderRadius="input"
                  borderWidth="1px"
                  borderColor="red.200"
                  bg="red.50"
                  _dark={{ bg: 'rgba(127, 29, 29, 0.2)', borderColor: 'red.800' }}
                >
                  {String((connectError as Error).message || connectError)}
                </Text>
              ) : null}

              <Button
                mt={5}
                w="full"
                colorPalette="purple"
                borderRadius="input"
                loading={isConnecting}
                disabled={!username || !password}
                onClick={() => void handleConnect()}
              >
                Sign in
              </Button>
            </PanelBody>
          </Panel>
        </motion.div>
      </FadeIn>
    </VStack>
  )
}
