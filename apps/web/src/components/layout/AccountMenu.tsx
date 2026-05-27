import { Avatar, Button, Menu, Portal, Text } from '@chakra-ui/react'
import { ChevronDown, LogOut, User } from 'lucide-react'
import { useAuth } from '../../hooks/use-auth'
import { useAccentPalette } from '../../hooks/use-ui-config'

export function AccountMenu() {
  const { username, logout } = useAuth()
  const accentPalette = useAccentPalette()
  const display = username ?? 'Account'
  const initial = (display[0] ?? '?').toUpperCase()

  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          colorPalette={accentPalette}
          borderRadius="var(--radius-input)"
          px={2}
          gap={1.5}
          maxW="11rem"
          _open={{ bg: 'bg.navActive' }}
        >
          <Avatar.Root size="xs" colorPalette={accentPalette}>
            <Avatar.Fallback name={display}>{initial}</Avatar.Fallback>
          </Avatar.Root>
          <Text fontSize="sm" truncate display={{ base: 'none', sm: 'block' }}>
            {display}
          </Text>
          <ChevronDown size={14} strokeWidth={2} aria-hidden />
        </Button>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content
            minW="11rem"
            borderRadius="input"
            borderWidth="1px"
            borderColor="border.subtle"
            bg="bg.panel"
            py={1}
          >
            <Menu.Item value="account" disabled closeOnSelect={false}>
              <User size={16} strokeWidth={2} />
              <Text fontSize="sm" fontWeight="medium" truncate>
                {display}
              </Text>
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item
              value="logout"
              color="red.500"
              _hover={{ bg: 'red.50', _dark: { bg: 'rgba(248, 81, 73, 0.12)' } }}
              onClick={logout}
            >
              <LogOut size={16} strokeWidth={2} />
              Sign out
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
