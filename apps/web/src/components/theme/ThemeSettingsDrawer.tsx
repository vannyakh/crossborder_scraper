import {
  Box,
  Button,
  ColorPicker,
  Drawer,
  Field,
  HStack,
  IconButton,
  Input,
  Portal,
  Separator,
  SegmentGroup,
  Switch,
  Text,
  VStack,
  parseColor,
} from '@chakra-ui/react'
import { Monitor, Moon, SlidersHorizontal, Sun, X } from 'lucide-react'
import { useState } from 'react'
import { fieldStyles } from '../ui/field-styles'
import { useThemeActions } from '../../hooks/use-theme-actions'
import { useAccentPalette, useUiConfig } from '../../hooks/use-ui-config'
import {
  motionSpeedOptions,
  pageTransitionOptions,
  type ColorMode,
  type Density,
  type FontScale,
  type MotionSpeed,
  type PageTransitionStyle,
  type RadiusScale,
} from '../../theme/config'
import { THEME_COLOR_PRESETS, THEME_STYLE_OPTIONS } from '../../theme/panel-appearance'
import { useUiStore } from '../../stores/ui-store'

type DrawerTab = 'theme' | 'layout' | 'motion'

const DRAWER_TAB_ITEMS: { value: DrawerTab; label: string }[] = [
  { value: 'theme', label: 'Theme' },
  { value: 'layout', label: 'Layout' },
  { value: 'motion', label: 'Motion' },
]

const THEME_DRAWER_ATTR = 'data-theme-settings-drawer'
const bodyPortalRef = { current: typeof document !== 'undefined' ? document.body : null }

const THEME_STYLE_HINT = 'Select the interface theme; Auto follows your system preference.'
const THEME_COLOR_HINT =
  'Preset accent colors or pick a custom hex value for the panel tone.'

function keepPickerOpenInsideThemeDrawer(event: { preventDefault: () => void; target?: EventTarget | null }) {
  const target = event.target
  if (target instanceof Element && target.closest(`[${THEME_DRAWER_ATTR}]`)) {
    event.preventDefault()
  }
}

const radiusOptions: { value: RadiusScale; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
]

const fontOptions: { value: FontScale; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
]

const densityOptions: { value: Density; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
]

function DrawerField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <Box>
      <Text fontSize="sm" fontWeight="medium" mb={hint ? 1 : 2}>
        {label}
      </Text>
      {hint ? (
        <Text fontSize="xs" color="fg.subtle" mb={2.5} lineHeight="short">
          {hint}
        </Text>
      ) : null}
      {children}
    </Box>
  )
}

function ThemePickCard({
  active,
  label,
  onClick,
  children,
  className = '',
}: {
  active: boolean
  label: string
  onClick?: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      className={`theme-pick-card theme-pick-card--drawer${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {active ? <span className="theme-pick-card__dot" aria-hidden /> : null}
      <div className="theme-pick-card__content">{children}</div>
      <div className="theme-pick-card__label">{label}</div>
    </button>
  )
}

function OptionRow<T extends string>({
  label,
  hint,
  value,
  options,
  accentPalette,
  onChange,
}: {
  label: string
  hint?: string
  value: T
  options: { value: T; label: string }[]
  accentPalette: string
  onChange: (value: T) => void
}) {
  return (
    <DrawerField label={label} hint={hint}>
      <HStack gap={1} flexWrap="wrap">
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <Button
              key={opt.value}
              size="xs"
              variant={selected ? 'solid' : 'outline'}
              colorPalette={selected ? accentPalette : 'gray'}
              borderRadius="var(--radius-input)"
              borderColor="border.subtle"
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </Button>
          )
        })}
      </HStack>
    </DrawerField>
  )
}

function normalizeHex(hex: string): string {
  const trimmed = hex.trim()
  if (!trimmed) return trimmed
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

function DrawerCustomColorPicker({
  value,
  active,
  onChange,
}: {
  value: string
  active: boolean
  onChange: (hex: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <ColorPicker.Root
      open={pickerOpen}
      onOpenChange={(details) => setPickerOpen(details.open)}
      value={parseColor(value)}
      onValueChange={(details) => onChange(normalizeHex(details.value.toString('hex')))}
      positioning={{
        strategy: 'fixed',
        placement: 'left-start',
        gutter: 8,
        flip: true,
      }}
      onPointerDownOutside={keepPickerOpenInsideThemeDrawer}
      onInteractOutside={keepPickerOpenInsideThemeDrawer}
      onFocusOutside={keepPickerOpenInsideThemeDrawer}
    >
      <ColorPicker.HiddenInput />
      <ColorPicker.Control>
        <ColorPicker.Trigger asChild>
          <button
            type="button"
            className={`theme-pick-card theme-pick-card--drawer theme-pick-card--custom${active ? ' is-active' : ''}`}
            aria-label="Custom color"
            aria-pressed={active}
          >
            {active ? <span className="theme-pick-card__dot" aria-hidden /> : null}
            <div className="theme-pick-card__content">
              <ColorPicker.ValueSwatch
                w="28px"
                h="28px"
                borderRadius="md"
                borderWidth="1px"
                borderColor="border.subtle"
              />
            </div>
            <div className="theme-pick-card__label">Custom</div>
          </button>
        </ColorPicker.Trigger>
      </ColorPicker.Control>
      <Portal container={bodyPortalRef}>
        <ColorPicker.Positioner zIndex={10001}>
          <ColorPicker.Content
            bg="bg.panel"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="var(--radius-panel)"
            shadow="lg"
            p={3}
            minW="240px"
          >
            <ColorPicker.Area />
            <HStack mt={3} gap={2} align="center">
              <ColorPicker.EyeDropper size="xs" variant="outline" aria-label="Pick color from screen" />
              <ColorPicker.Sliders flex="1" />
            </HStack>
          </ColorPicker.Content>
        </ColorPicker.Positioner>
      </Portal>
    </ColorPicker.Root>
  )
}

function DrawerThemeTab() {
  const { mode, setMode } = useUiConfig()
  const {
    activeAccentHex,
    activePreset,
    isCustomAccentColor,
    setAccentHex,
    resetAccentColor,
  } = useThemeActions()

  return (
    <VStack align="stretch" gap={4}>
      <DrawerField label="Theme style" hint={THEME_STYLE_HINT}>
        <Box className="theme-pick-group theme-pick-group--drawer">
          {THEME_STYLE_OPTIONS.map((opt) => (
            <ThemePickCard
              key={opt.value}
              active={mode === opt.value}
              label={opt.label}
              onClick={() => setMode(opt.value as ColorMode)}
            >
              {opt.value === 'system' ? (
                <Monitor size={20} strokeWidth={1.75} />
              ) : opt.value === 'light' ? (
                <Sun size={20} strokeWidth={1.75} />
              ) : (
                <Moon size={20} strokeWidth={1.75} />
              )}
            </ThemePickCard>
          ))}
        </Box>
      </DrawerField>

      <Separator borderColor="border.subtle" />

      <DrawerField label="Theme color" hint={THEME_COLOR_HINT}>
        <Box className="theme-pick-group theme-pick-group--drawer">
          {THEME_COLOR_PRESETS.map((preset) => (
            <ThemePickCard
              key={preset.id}
              active={activePreset?.id === preset.id}
              label={preset.label}
              onClick={() => setAccentHex(preset.hex)}
            >
              <span className="theme-color-block" style={{ backgroundColor: preset.hex }} />
            </ThemePickCard>
          ))}
          <DrawerCustomColorPicker
            value={activeAccentHex}
            active={isCustomAccentColor}
            onChange={setAccentHex}
          />
        </Box>
        <HStack mt={3} gap={2} flexWrap="wrap" align="flex-end">
          <Field.Root maxW="140px" flex="1" minW="120px">
            <Field.Label fontSize="xs" color="fg.muted">
              Custom hex
            </Field.Label>
            <Input
              {...fieldStyles}
              size="sm"
              value={activeAccentHex}
              onChange={(e) => setAccentHex(e.target.value)}
              fontFamily="mono"
            />
          </Field.Root>
          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="var(--radius-input)"
            onClick={resetAccentColor}
          >
            Restore default
          </Button>
        </HStack>
      </DrawerField>
    </VStack>
  )
}

function DrawerLayoutTab() {
  const { config, accentPalette, setConfig } = useUiConfig()

  return (
    <VStack align="stretch" gap={4}>
      <OptionRow
        label="Corner radius"
        hint="Rounds corners on panels, inputs, and cards."
        value={config.radius}
        options={radiusOptions}
        accentPalette={accentPalette}
        onChange={(radius) => setConfig({ radius })}
      />
      <OptionRow
        label="Font size"
        hint="Base text size across the app."
        value={config.fontScale}
        options={fontOptions}
        accentPalette={accentPalette}
        onChange={(fontScale) => setConfig({ fontScale })}
      />
      <OptionRow
        label="Density"
        hint="Tighter or roomier spacing in lists and forms."
        value={config.density}
        options={densityOptions}
        accentPalette={accentPalette}
        onChange={(density) => setConfig({ density })}
      />
    </VStack>
  )
}

function DrawerMotionTab() {
  const { config, accentPalette, setConfig } = useUiConfig()

  return (
    <VStack align="stretch" gap={4}>
      <DrawerField label="Page transitions" hint="Animate when navigating between pages.">
        <HStack justify="space-between" py={0.5}>
          <Text fontSize="sm" color="fg.muted">
            {config.pageTransitions ? 'Enabled' : 'Disabled'}
          </Text>
          <Switch.Root
            checked={config.pageTransitions}
            onCheckedChange={(e) => setConfig({ pageTransitions: !!e.checked })}
            colorPalette={accentPalette}
          >
            <Switch.HiddenInput />
            <Switch.Control />
          </Switch.Root>
        </HStack>
      </DrawerField>

      {config.pageTransitions ? (
        <OptionRow
          label="Transition style"
          value={config.pageTransition === 'none' ? 'fade' : config.pageTransition}
          options={pageTransitionOptions.filter((o) => o.value !== 'none')}
          accentPalette={accentPalette}
          onChange={(pageTransition) =>
            setConfig({ pageTransition: pageTransition as PageTransitionStyle })
          }
        />
      ) : null}

      <OptionRow
        label="Animation speed"
        value={config.motionSpeed}
        options={motionSpeedOptions}
        accentPalette={accentPalette}
        onChange={(motionSpeed) => setConfig({ motionSpeed: motionSpeed as MotionSpeed })}
      />

      <DrawerField label="Reduce motion" hint="Minimize animations site-wide.">
        <HStack justify="space-between" py={0.5}>
          <Text fontSize="sm" color="fg.muted">
            {config.reducedMotion ? 'On' : 'Off'}
          </Text>
          <Switch.Root
            checked={config.reducedMotion}
            onCheckedChange={(e) => setConfig({ reducedMotion: !!e.checked })}
            colorPalette={accentPalette}
          >
            <Switch.HiddenInput />
            <Switch.Control />
          </Switch.Root>
        </HStack>
      </DrawerField>
    </VStack>
  )
}

function DrawerPanel() {
  const { mode, config, accentPalette, resetConfig } = useUiConfig()
  const { activeAccentHex } = useThemeActions()
  const setOpen = useUiStore((s) => s.setSettingsDrawerOpen)
  const [tab, setTab] = useState<DrawerTab>('theme')

  return (
    <Drawer.Content
      maxW="sm"
      bg="bg.panel"
      borderRadius="var(--radius-panel)"
      display="flex"
      flexDirection="column"
      {...{ [THEME_DRAWER_ATTR]: '' }}
    >
      <Box display="flex" flexDirection="column" flex={1} minH={0}>
        <Drawer.Header
          borderBottomWidth="1px"
          borderColor="border.subtle"
          pt={3}
          pb={3}
          px={4}
          position="relative"
          display="flex"
          flexDirection="column"
          alignItems="stretch"
          flexShrink={0}
        >
          <Drawer.CloseTrigger asChild position="absolute" top={3} right={3} zIndex={1}>
            <IconButton aria-label="Close settings" size="sm" variant="ghost" borderRadius="var(--radius-input)">
              <X size={18} />
            </IconButton>
          </Drawer.CloseTrigger>

          <Box className="theme-drawer-header">
            <Drawer.Title fontSize="md" fontWeight="semibold" lineHeight="short">
              Theme & UI
            </Drawer.Title>
            <Text fontSize="xs" color="fg.subtle" lineHeight="short">
              Quick theme and layout — same values as Panel appearance settings.
            </Text>
          </Box>

          <SegmentGroup.Root
            value={tab}
            onValueChange={(details) => setTab(details.value as DrawerTab)}
            size="sm"
            colorPalette={accentPalette}
            className="theme-drawer-segments"
            w="full"
          >
            <SegmentGroup.Indicator />
            <SegmentGroup.Items items={DRAWER_TAB_ITEMS} />
          </SegmentGroup.Root>
        </Drawer.Header>

        <Drawer.Body py={4} px={4} className="app-scroll" flex={1} minH={0}>
          {tab === 'theme' ? <DrawerThemeTab /> : null}
          {tab === 'layout' ? <DrawerLayoutTab /> : null}
          {tab === 'motion' ? <DrawerMotionTab /> : null}

        <Separator borderColor="border.subtle" my={5} />

        <Text fontSize="xs" color="fg.subtle" mb={2}>
          Current
        </Text>
        <Box
          p={2.5}
          borderRadius="var(--radius-input)"
          bg="bg.input"
          fontSize="xs"
          color="fg.muted"
          fontFamily="mono"
          lineHeight="tall"
        >
          {activeAccentHex} · {mode} ·{' '}
          {config.pageTransitions ? config.pageTransition : 'no transitions'}
        </Box>

        <Button
          size="sm"
          variant="outline"
          borderColor="border.subtle"
          borderRadius="var(--radius-input)"
          w="full"
          mt={3}
          onClick={resetConfig}
        >
          Reset to defaults
        </Button>
        </Drawer.Body>
      </Box>

      <Drawer.Footer borderTopWidth="1px" borderColor="border.subtle" py={3} px={4} flexShrink={0}>
        <Button
          w="full"
          colorPalette={accentPalette}
          borderRadius="var(--radius-input)"
          onClick={() => setOpen(false)}
        >
          Done
        </Button>
      </Drawer.Footer>
    </Drawer.Content>
  )
}

export function ThemeSettingsDrawer() {
  const open = useUiStore((s) => s.settingsDrawerOpen)
  const setOpen = useUiStore((s) => s.setSettingsDrawerOpen)

  return (
    <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="end" size="sm">
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <DrawerPanel />
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}

export function ThemeSettingsButton() {
  const setOpen = useUiStore((s) => s.setSettingsDrawerOpen)
  const accentPalette = useAccentPalette()

  return (
    <IconButton
      aria-label="Theme and UI settings"
      size="sm"
      variant="ghost"
      colorPalette={accentPalette}
      borderRadius="var(--radius-input)"
      onClick={() => setOpen(true)}
    >
      <SlidersHorizontal size={18} strokeWidth={2} />
    </IconButton>
  )
}
