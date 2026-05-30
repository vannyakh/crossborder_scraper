import { Box, Button, Field, HStack, Image, Input, Text } from '@chakra-ui/react'
import { RefreshCw, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchLoginCaptcha, type CaptchaChallenge } from '../../lib/api/auth'
import { fieldStyles } from '../ui/field-styles'

type LoginCaptchaProps = {
  answer: string
  onAnswerChange: (value: string) => void
  onChallengeChange: (challenge: CaptchaChallenge | null) => void
  disabled?: boolean
}

export function LoginCaptcha({
  answer,
  onAnswerChange,
  onChallengeChange,
  disabled = false,
}: LoginCaptchaProps) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const loadCaptcha = useCallback(async () => {
    setLoading(true)
    setError(null)
    onAnswerChange('')
    try {
      const next = await fetchLoginCaptcha()
      setChallenge(next)
      onChallengeChange(next)
    } catch (err) {
      setChallenge(null)
      onChallengeChange(null)
      setError(err instanceof Error ? err.message : 'Could not load captcha')
    } finally {
      setLoading(false)
    }
  }, [onAnswerChange, onChallengeChange])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCaptcha()
  }, [loadCaptcha])

  const mediaSrc = challenge ? `data:${challenge.mime_type};base64,${challenge.media_base64}` : null

  return (
    <Field.Root required>
      <Field.Label fontSize="xs" color="fg.muted">
        Verification
      </Field.Label>
      <Box
        p={3}
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="var(--radius-input)"
        bg="bg.input"
      >
        {error ? (
          <Text fontSize="sm" color="red.500" mb={2}>
            {error}
          </Text>
        ) : null}

        {challenge?.kind === 'image' && mediaSrc ? (
          <Image
            src={mediaSrc}
            alt="Captcha code"
            mx="auto"
            mb={3}
            maxH="80px"
            objectFit="contain"
            borderRadius="md"
          />
        ) : null}

        {challenge?.kind === 'audio' && mediaSrc ? (
          <audio ref={audioRef} src={mediaSrc} preload="auto" hidden />
        ) : null}

        <HStack gap={2} mb={2} align="stretch" flexWrap={{ base: 'wrap', sm: 'nowrap' }}>
          {challenge?.kind === 'audio' && mediaSrc ? (
            <Button
              size="sm"
              variant="outline"
              borderColor="border.subtle"
              borderRadius="input"
              flexShrink={0}
              onClick={() => void audioRef.current?.play()}
              disabled={disabled || loading}
            >
              <Volume2 size={14} />
              Play code
            </Button>
          ) : null}
          <Input
            {...fieldStyles}
            flex={1}
            minW={0}
            placeholder={challenge?.kind === 'audio' ? 'Enter heard code' : 'Enter code'}
            value={answer}
            autoComplete="off"
            autoCapitalize="characters"
            disabled={disabled || loading || !challenge}
            onChange={(e) => onAnswerChange(e.target.value.toUpperCase())}
          />
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="input"
            flexShrink={0}
            aria-label="Refresh captcha"
            loading={loading}
            disabled={disabled}
            onClick={() => void loadCaptcha()}
          >
            <RefreshCw size={14} />
          </Button>
        </HStack>

        <Text fontSize="xs" color="fg.subtle">
          {challenge?.kind === 'audio'
            ? 'Listen and type the characters you hear.'
            : 'Type the characters shown in the image.'}
        </Text>
      </Box>
    </Field.Root>
  )
}
