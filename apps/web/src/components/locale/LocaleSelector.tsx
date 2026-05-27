import { Button, HStack, Menu, Portal, Text } from '@chakra-ui/react'
import { Check, ChevronDown, Languages } from 'lucide-react'
import { LOCALE_OPTIONS } from '../../locale/config'
import type { AppLocale } from '../../locale/types'
import { useLocale } from '../../hooks/use-locale'
import { useAccentPalette } from '../../hooks/use-ui-config'

export function LocaleSelector() {
  const { locale, setLocale, t } = useLocale()
  const accentPalette = useAccentPalette()
  const currentLabel = t(`locale.${locale}`)

  return (
    <Menu.Root positioning={{ placement: 'bottom-start' }} closeOnSelect>
      <Menu.Trigger asChild>
        <Button
          size="sm"
          variant="outline"
          colorPalette={accentPalette}
          borderRadius="var(--radius-input)"
          borderColor="border.subtle"
          w="full"
          justifyContent="space-between"
          fontWeight="normal"
        >
          <HStack gap={2} minW={0}>
            <Languages size={16} strokeWidth={2} aria-hidden />
            <Text fontSize="sm" truncate>
              {currentLabel}
            </Text>
          </HStack>
          <ChevronDown size={14} strokeWidth={2} aria-hidden />
        </Button>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content
            minW="var(--reference-width)"
            borderRadius="input"
            borderWidth="1px"
            borderColor="border.subtle"
            bg="bg.panel"
            py={1}
          >
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel px={3} py={1.5} fontSize="xs" color="fg.muted">
                {t('locale.label')}
              </Menu.ItemGroupLabel>
              {LOCALE_OPTIONS.map((option) => {
                const selected = locale === option.value
                return (
                  <Menu.Item
                    key={option.value}
                    value={option.value}
                    onClick={() => setLocale(option.value as AppLocale)}
                    bg={selected ? 'bg.panelHover' : undefined}
                  >
                    <HStack gap={2} w="full" justify="space-between">
                      <Text fontSize="sm">{t(`locale.${option.value}`)}</Text>
                      {selected ? <Check size={16} strokeWidth={2} aria-hidden /> : null}
                    </HStack>
                  </Menu.Item>
                )
              })}
            </Menu.ItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
