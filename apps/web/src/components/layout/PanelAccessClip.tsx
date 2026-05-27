import { useCallback, useState, type CSSProperties } from 'react'
import type { PanelAccess } from '../../lib/api'
import { copyPanelAccess } from '../../lib/panel-access'

const btnStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'ui-monospace, monospace',
  lineHeight: 1.2,
}

export function PanelAccessClip({
  access,
  collapsed,
}: {
  access: PanelAccess
  collapsed?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const ip = access.access_ip
  const copyHint = access.copy_text

  const handleCopy = useCallback(async () => {
    try {
      await copyPanelAccess(access)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [access])

  if (collapsed) {
    return (
      <button
        type="button"
        title={`Copy ${copyHint}`}
        aria-label={`Copy panel access ${copyHint}`}
        onClick={() => void handleCopy()}
        style={{
          ...btnStyle,
          textAlign: 'center',
          fontSize: '0.6rem',
          color: 'var(--chakra-colors-fg-muted)',
        }}
      >
        IP
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={`Click to copy ${copyHint}`}
      aria-label={`Panel access IP ${ip}, copy ${copyHint}`}
      style={{
        ...btnStyle,
        fontSize: '0.7rem',
        color: copied ? 'var(--chakra-colors-green-500)' : 'var(--chakra-colors-fg-muted)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!copied) e.currentTarget.style.color = 'var(--brand-emphasis)'
      }}
      onMouseLeave={(e) => {
        if (!copied) e.currentTarget.style.color = 'var(--chakra-colors-fg-muted)'
      }}
    >
      {copied ? 'Copied' : ip}
    </button>
  )
}
