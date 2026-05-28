import { Button } from '@chakra-ui/react'
import { useLocale } from '../../hooks/use-locale'
import { notifySuccess } from '../../lib/toast'

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
  const canCopy = Boolean(value && value !== '—')

  const display = masked && canCopy ? '••••••••' : value || '—'

  async function handleClick() {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(value)
      notifySuccess(t('db.manage.copied'), { duration: 2000 })
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      h="auto"
      minH={0}
      maxW="full"
      px={0}
      py={0}
      fontFamily={mono ? 'mono' : undefined}
      fontWeight={mono ? undefined : 'medium'}
      justifyContent="flex-start"
      color={canCopy ? 'fg' : 'fg.muted'}
      textDecoration={canCopy ? 'underline dotted' : undefined}
      textUnderlineOffset="2px"
      disabled={!canCopy}
      _hover={canCopy ? { color: 'fg.emphasized', bg: 'transparent' } : undefined}
      _disabled={{ cursor: 'default', opacity: 1 }}
      onClick={() => void handleClick()}
      title={canCopy ? t('db.table.clickToCopy') : undefined}
    >
      {display}
    </Button>
  )
}
