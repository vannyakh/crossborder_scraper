import { Box, Button, Field, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FadeIn } from '../components/motion/FadeIn'
import { fieldStyles } from '../components/ui/field-styles'
import { Panel, PanelBody } from '../components/ui/Panel'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useAuth } from '../hooks/use-auth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { connect, isConnecting, connectError } = useAuth()
  const [name, setName] = useState('Operator')
  const [token, setToken] = useState('')

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const apiOffline = Boolean((location.state as { apiOffline?: boolean } | null)?.apiOffline)

  async function handleConnect() {
    try {
      await connect({ name, token: token || undefined })
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
                Connect to scraper API
              </Text>
              <Text mt={2} fontSize="sm" color="fg.muted">
                Access is gated until the API at port 8000 responds to{' '}
                <Box as="code" fontFamily="mono" fontSize="xs" color="fg">
                  /health
                </Box>
                .
              </Text>

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
                  API went offline. Start the server with{' '}
                  <Box as="code" fontFamily="mono" fontSize="xs">
                    uv run serve
                  </Box>
                </Text>
              ) : null}

              <Field.Root mt={5}>
                <Field.Label color="fg.muted" fontSize="xs">
                  Display name
                </Field.Label>
                <Input {...fieldStyles} value={name} onChange={(e) => setName(e.target.value)} />
              </Field.Root>

              <Field.Root mt={3}>
                <Field.Label color="fg.muted" fontSize="xs">
                  API token (optional)
                </Field.Label>
                <Input
                  {...fieldStyles}
                  type="password"
                  placeholder="Bearer token if enabled later"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
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
                onClick={() => void handleConnect()}
              >
                Connect
              </Button>
            </PanelBody>
          </Panel>
        </motion.div>
      </FadeIn>
    </VStack>
  )
}
