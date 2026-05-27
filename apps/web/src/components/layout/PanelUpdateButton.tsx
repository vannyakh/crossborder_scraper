import { Badge, Box, IconButton } from '@chakra-ui/react'
import { ArrowUpCircle } from 'lucide-react'
import { useState } from 'react'
import { useGatewayStatusQuery } from '../../hooks/queries/use-gateway-query'
import { usePanelUpdateStatusQuery } from '../../hooks/queries/use-panel-update-query'
import { useAccentPalette } from '../../hooks/use-ui-config'
import { PanelUpdateDialog } from './PanelUpdateDialog'

export function PanelUpdateButton() {
  const accentPalette = useAccentPalette()
  const [open, setOpen] = useState(false)
  const gateway = useGatewayStatusQuery()
  const updateStatus = usePanelUpdateStatusQuery()

  const updateAvailable =
    updateStatus.data?.update_available ??
    gateway.data?.update_available ??
    false

  const latest = updateStatus.data?.latest_version ?? gateway.data?.latest_version
  const current = updateStatus.data?.current_version ?? gateway.data?.version

  const label = updateAvailable
    ? `Update available: v${current} → v${latest}`
    : `Panel version v${current ?? '—'}`

  return (
    <>
      <Box position="relative" display="inline-flex">
        <IconButton
          aria-label={label}
          title={label}
          size="sm"
          variant="ghost"
          colorPalette={updateAvailable ? 'green' : accentPalette}
          borderRadius="var(--radius-input)"
          onClick={() => setOpen(true)}
        >
          <ArrowUpCircle size={18} strokeWidth={2} />
        </IconButton>
        {updateAvailable ? (
          <Badge
            position="absolute"
            top="-2px"
            right="-2px"
            size="xs"
            colorPalette="green"
            variant="solid"
            borderRadius="full"
            minW="8px"
            h="8px"
            p={0}
            aria-hidden
          />
        ) : null}
      </Box>
      <PanelUpdateDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
