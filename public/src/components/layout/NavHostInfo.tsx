import { Box, HStack, HoverCard, Portal, Text } from '@chakra-ui/react'
import { Server } from 'lucide-react'
import { useHardwareMonitorQuery } from '../../hooks/queries/use-monitor-query'
import { formatHostUptime } from '../dashboard/dashboard-utils'

function NavDivider() {
  return (
    <Box
      display={{ base: 'none', md: 'block' }}
      w="1px"
      h="1.25rem"
      bg="border.subtle"
      mx={1}
      flexShrink={0}
      aria-hidden
    />
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <HStack
      align="flex-start"
      gap={3}
      py={2}
      fontSize="sm"
      borderBottomWidth="1px"
      borderColor="border.subtle"
      _last={{ borderBottomWidth: 0 }}
    >
      <Text color="fg.muted" flexShrink={0} minW="5.5rem">
        {label}
      </Text>
      <Text color="fg" fontWeight="medium" wordBreak="break-word">
        {value}
      </Text>
    </HStack>
  )
}

export function NavHostInfo() {
  const { data } = useHardwareMonitorQuery()
  const label = data?.system_label ?? 'System'
  const systemDetail =
    data?.system_detail ?? (data ? `${data.platform} (Py${data.python_version})` : 'Loading…')
  const hostname = data?.hostname ?? '—'
  const uptime =
    data?.host_uptime_label ??
    (data?.host_uptime_seconds != null ? formatHostUptime(data.host_uptime_seconds) : '—')

  return (
    <>
      <NavDivider />
      <HoverCard.Root openDelay={150} closeDelay={100} positioning={{ placement: 'bottom-end' }}>
        <HoverCard.Trigger asChild>
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-input)',
              border: 'none',
              background: 'transparent',
              cursor: 'default',
              color: 'inherit',
              font: 'inherit',
              fontSize: '0.875rem',
              fontWeight: 500,
              maxWidth: '10rem',
            }}
          >
            <Box as="span" display="inline-flex" color="brand.emphasis">
              <Server size={16} strokeWidth={2} />
            </Box>
            <Text as="span" truncate color="fg">
              {label}
            </Text>
          </button>
        </HoverCard.Trigger>
        <Portal>
          <HoverCard.Positioner zIndex={60}>
            <HoverCard.Content
              p={0}
              bg="transparent"
              border="none"
              shadow="none"
              minW="280px"
            >
              <Box
                bg="var(--flyout-bg)"
                borderWidth="1px"
                borderColor="border.subtle"
                borderRadius="var(--radius-panel)"
                boxShadow="var(--flyout-shadow)"
                px={3}
                py={1}
              >
                <InfoLine label="System:" value={systemDetail} />
                <InfoLine label="Hostname:" value={hostname} />
                <InfoLine label="Up Time:" value={uptime} />
              </Box>
            </HoverCard.Content>
          </HoverCard.Positioner>
        </Portal>
      </HoverCard.Root>
    </>
  )
}

export { NavDivider }
