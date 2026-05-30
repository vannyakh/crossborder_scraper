import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  Heading,
  Input,
  Separator,
  Text,
  VStack,
} from '@chakra-ui/react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoginCaptcha } from '../components/auth/LoginCaptcha'
import { FadeIn } from '../components/motion/FadeIn'
import { ServerErrorState } from '../components/ui/ServerErrorState'
import type { CaptchaChallenge } from '../lib/api/auth'
import { LoginRequestError } from '../lib/api/auth'
import { BrandVersionBadge } from '../components/layout/ShellChrome'
import { ShellLogoMark } from '../components/layout/ShellLogoMark'
import { fieldStyles } from '../components/ui/field-styles'
import { Panel, PanelBody } from '../components/ui/Panel'
import { ThemeSettingsButton } from '../components/theme/ThemeSettingsDrawer'
import { useAccentPalette, useUiConfig } from '../hooks/use-ui-config'
import { useAuth, useAuthStatusQuery, usePublicHealthQuery } from '../hooks'
import { notifyError } from '../lib/toast'
import { usePanelAppearance } from '../hooks/use-panel-appearance'
import { useThemeStore } from '../stores/theme-store'
import { resolveLoginBackgroundImageUrl } from '../theme/panel-appearance'

function LoginNotice({
  tone,
  children,
}: {
  tone: 'warning' | 'danger' | 'muted'
  children: ReactNode
}) {
  const color = tone === 'danger' ? 'red.500' : tone === 'warning' ? 'orange.500' : 'fg.muted'

  return (
    <Box
      p={3}
      fontSize="sm"
      lineHeight="short"
      color={color}
      borderRadius="var(--radius-input)"
      bg="bg.input"
      borderWidth="1px"
      borderColor="border.subtle"
    >
      {children}
    </Box>
  )
}

function LoginBrandPanel({ version }: { version?: string }) {
  return (
    <VStack
      className="login-page__brand"
      align="flex-start"
      justify="center"
      gap={6}
      h="full"
      minH={{ base: 'auto', lg: '420px' }}
      py={{ base: 2, lg: 0 }}
    >
      <HStackBrand version={version} />
      <Box maxW="md">
        <Heading
          as="h1"
          fontSize={{ base: 'xl', md: '2xl' }}
          fontWeight="semibold"
          lineHeight="short"
        >
          Cross-border product intelligence
        </Heading>
        <Text mt={3} fontSize="sm" color="fg.muted" lineHeight="tall">
          Sign in to track products, review results, and export listings.
        </Text>
      </Box>
    </VStack>
  )
}

function HStackBrand({ version }: { version?: string }) {
  return (
    <Flex align="center" gap={2}>
      <ShellLogoMark collapsed={false} label="Cross-Border" />
      <Text
        fontFamily="heading"
        fontWeight="semibold"
        fontSize="sm"
        lineHeight="1"
        letterSpacing="-0.05em"
        textTransform="uppercase"
        color="fg"
      >
        Cross-Border
      </Text>
      <BrandVersionBadge version={version} />
    </Flex>
  )
}

type LoginFormCardProps = {
  username: string
  password: string
  isConnecting: boolean
  needsSetup: boolean
  apiOffline: boolean
  apiError: unknown
  onRetryHealth: () => void
  healthRetrying: boolean
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: () => void
  captchaRequired: boolean
  captchaAnswer: string
  onCaptchaAnswerChange: (value: string) => void
  onCaptchaChallengeChange: (challenge: CaptchaChallenge | null) => void
}

function LoginFormCard({
  username,
  password,
  isConnecting,
  needsSetup,
  apiOffline,
  apiError,
  onRetryHealth,
  healthRetrying,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  captchaRequired,
  captchaAnswer,
  onCaptchaAnswerChange,
  onCaptchaChallengeChange,
  version,
}: LoginFormCardProps & { version?: string }) {
  const accentPalette = useAccentPalette()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!username || !password || isConnecting) return
    if (captchaRequired && !captchaAnswer.trim()) return
    onSubmit()
  }

  return (
    <Panel className="login-page__card" w="full" maxW="md" mx={{ base: 'auto', lg: 0 }}>
      <PanelBody p={{ base: 5, md: 6 }}>
        <Box display={{ base: 'block', lg: 'none' }} mb={5}>
          <HStackBrand version={version} />
        </Box>

        <VStack align="stretch" gap={1} mb={5}>
          <Heading as="h2" fontSize="lg" fontWeight="semibold">
            Sign in
          </Heading>
          <Text fontSize="sm" color="fg.muted">
            Use the credentials from your panel setup.
          </Text>
        </VStack>

        {apiOffline ? (
          <Box mb={4}>
            <ServerErrorState
              compact
              error={apiError}
              onRetry={onRetryHealth}
              retrying={healthRetrying}
            />
          </Box>
        ) : (
          <VStack align="stretch" gap={3} mb={4}>
            {needsSetup ? (
              <LoginNotice tone="muted">
                Run <code className="login-page__code">scraper setup</code> to generate credentials.
              </LoginNotice>
            ) : null}
          </VStack>
        )}

        <Box as="form" onSubmit={handleSubmit} hidden={apiOffline}>
          <VStack align="stretch" gap={4}>
            <Field.Root required>
              <Field.Label fontSize="xs" color="fg.muted">
                Username
              </Field.Label>
              <Input
                {...fieldStyles}
                autoComplete="username"
                autoFocus
                placeholder="admin"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label fontSize="xs" color="fg.muted">
                Password
              </Field.Label>
              <Input
                {...fieldStyles}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
              />
            </Field.Root>

            {captchaRequired ? (
              <LoginCaptcha
                answer={captchaAnswer}
                onAnswerChange={onCaptchaAnswerChange}
                onChallengeChange={onCaptchaChallengeChange}
                disabled={isConnecting}
              />
            ) : null}

            <Button
              type="submit"
              w="full"
              size="md"
              colorPalette={accentPalette}
              borderRadius="var(--radius-input)"
              loading={isConnecting}
              disabled={!username || !password || (captchaRequired && !captchaAnswer.trim())}
            >
              Sign in
            </Button>
          </VStack>
        </Box>

        <Separator borderColor="border.subtle" my={5} />

        <Text fontSize="xs" color="fg.subtle" textAlign="center" lineHeight="short">
          © {new Date().getFullYear()} Cross-Border. All rights reserved.
        </Text>
      </PanelBody>
    </Panel>
  )
}

export function LoginPage() {
  usePanelAppearance()

  const navigate = useNavigate()
  const location = useLocation()
  const { connect, isConnecting } = useAuth()
  const { data: authStatus } = useAuthStatusQuery()
  const healthQuery = usePublicHealthQuery()
  const { data: health } = healthQuery
  const appVersion = health?.version
  const { resolved } = useUiConfig()
  const loginBackground = useThemeStore((s) => s.config.loginPage.background)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [captchaForced, setCaptchaForced] = useState(false)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaChallenge, setCaptchaChallenge] = useState<CaptchaChallenge | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const apiOffline = healthQuery.isError
  const needsSetup = Boolean(authStatus && !authStatus.auth_configured)
  const captchaRequired = Boolean(authStatus?.captcha_required) || captchaForced

  const loginBgUrl = loginBackground.enabled
    ? resolveLoginBackgroundImageUrl(loginBackground, resolved)
    : null

  async function handleConnect() {
    try {
      await connect({
        username,
        password,
        ...(captchaRequired && captchaChallenge
          ? {
              captcha_id: captchaChallenge.captcha_id,
              captcha_answer: captchaAnswer.trim(),
            }
          : {}),
      })
      setCaptchaForced(false)
      setCaptchaAnswer('')
      setCaptchaChallenge(null)
      void navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof LoginRequestError && err.captcha_required) {
        setCaptchaForced(true)
      }
      notifyError(err)
    }
  }

  return (
    <Flex className="login-page" minH="100dvh" position="relative" overflow="hidden">
      <Box className="login-page__backdrop" aria-hidden />
      {loginBgUrl ? (
        <Box
          className="login-page__path-bg"
          aria-hidden
          style={{ backgroundImage: `url(${loginBgUrl})` }}
        />
      ) : null}
      <Box className="login-page__backdrop-overlay" aria-hidden />

      <Flex position="absolute" top={4} right={4} zIndex={2}>
        <ThemeSettingsButton />
      </Flex>

      <Flex
        position="relative"
        zIndex={1}
        flex={1}
        align="center"
        justify="center"
        px={{ base: 4, md: 8 }}
        py={{ base: 10, md: 12 }}
      >
        <Grid
          templateColumns={{ base: '1fr', lg: '1fr 1fr' }}
          gap={{ base: 8, lg: 12, xl: 16 }}
          w="full"
          maxW="5xl"
          alignItems="center"
        >
          <FadeIn className="login-page__brand-fade">
            <LoginBrandPanel version={appVersion} />
          </FadeIn>

          <FadeIn delay={0.08}>
            <LoginFormCard
              version={appVersion}
              username={username}
              password={password}
              isConnecting={isConnecting}
              needsSetup={needsSetup}
              apiOffline={apiOffline}
              apiError={healthQuery.error}
              onRetryHealth={() => void healthQuery.refetch()}
              healthRetrying={healthQuery.isFetching}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              captchaRequired={captchaRequired}
              captchaAnswer={captchaAnswer}
              onCaptchaAnswerChange={setCaptchaAnswer}
              onCaptchaChallengeChange={setCaptchaChallenge}
              onSubmit={() => void handleConnect()}
            />
          </FadeIn>
        </Grid>
      </Flex>
    </Flex>
  )
}
