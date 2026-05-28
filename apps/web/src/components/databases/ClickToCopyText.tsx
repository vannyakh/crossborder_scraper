import { Box, Text } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useLocale } from '../../hooks/use-locale'
import { useMotionEnabled, useMotionTransition } from '../../hooks/use-motion-props'

const MotionBox = motion.create(Box)

export function ClickToCopyText({
  value,
  masked = false,
  mono = false,
}: {
  value: string
  masked?: boolean
  mono?: boolean
}) {
  const { t } = useLocale()
  const motionEnabled = useMotionEnabled()
  const transition = useMotionTransition(0.2)
  const [copied, setCopied] = useState(false)
  const canCopy = Boolean(value && value !== '—')

  const display = masked && canCopy ? '••••••••' : value || '—'

  async function handleClick() {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked */
    }
  }

  const toastMotion = motionEnabled
    ? {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition,
      }
    : {}

  return (
    <Box position="relative" display="inline-block" maxW="full">
      <Text
        as="button"
        type="button"
        fontSize="sm"
        fontFamily={mono ? 'mono' : undefined}
        fontWeight={mono ? undefined : 'medium'}
        textAlign="left"
        color={canCopy ? 'fg' : 'fg.muted'}
        cursor={canCopy ? 'pointer' : 'default'}
        textDecoration={canCopy ? 'underline dotted' : undefined}
        textUnderlineOffset="2px"
        _hover={canCopy ? { color: 'fg.emphasized' } : undefined}
        onClick={() => void handleClick()}
        title={canCopy ? t('db.table.clickToCopy') : undefined}
      >
        {display}
      </Text>

      <AnimatePresence>
        {copied ? (
          <MotionBox
            position="absolute"
            left="50%"
            bottom="calc(100% + 6px)"
            zIndex={20}
            pointerEvents="none"
            px={2}
            py={1}
            borderRadius="var(--radius-input)"
            borderWidth="1px"
            borderColor="green.500"
            bg="bg.elevated"
            boxShadow="sm"
            fontSize="xs"
            fontWeight="medium"
            color="green.500"
            whiteSpace="nowrap"
            transform="translateX(-50%)"
            {...toastMotion}
          >
            {t('db.manage.copied')}
          </MotionBox>
        ) : null}
      </AnimatePresence>
    </Box>
  )
}
