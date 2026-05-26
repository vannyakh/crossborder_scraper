import {
  Box,
  Button,
  Drawer,
  HStack,
  IconButton,
  Portal,
  Separator,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { Settings, X } from 'lucide-react'
import {
  accentOptions,
  motionSpeedOptions,
  pageTransitionOptions,
  type AccentKey,
  type ColorMode,
  type Density,
  type FontScale,
  type MotionSpeed,
  type PageTransitionStyle,
  type RadiusScale,
} from '../../theme/config'
import { useAccentPalette, useUiConfig } from '../../hooks/use-ui-config'
import { useUiStore } from '../../stores/ui-store'

const colorModes: { value: ColorMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

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

const accentSwatches: Record<AccentKey, string> = {
  blue: '#2563eb',
  purple: '#7c3aed',
  green: '#16a34a',
  orange: '#ea580c',
  rose: '#e11d48',
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      fontSize="xs"
      fontWeight="semibold"
      color="fg.muted"
      textTransform="uppercase"
      letterSpacing="wider"
    >
      {children}
    </Text>
  )
}

function OptionRow<T extends string>({
  label,
  value,
  options,
  accentPalette,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  accentPalette: string
  onChange: (value: T) => void
}) {
  return (
    <Box>
      <Text fontSize="sm" mb={2} fontWeight="medium">
        {label}
      </Text>
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
    </Box>
  )
}

function DrawerPanel() {
  const { mode, config, accentPalette, setMode, setConfig, resetConfig } = useUiConfig()
  const setOpen = useUiStore((s) => s.setSettingsDrawerOpen)

  return (
    <Drawer.Content maxW="sm" bg="bg.panel" borderRadius="var(--radius-panel)">
      <Drawer.Header borderBottomWidth="1px" borderColor="border.subtle" py={3}>
        <Drawer.Title fontSize="md" fontWeight="semibold">
          Theme & UI
        </Drawer.Title>
        <Drawer.CloseTrigger asChild position="absolute" top={3} right={3}>
          <IconButton aria-label="Close settings" size="sm" variant="ghost" borderRadius="var(--radius-input)">
            <X size={18} />
          </IconButton>
        </Drawer.CloseTrigger>
      </Drawer.Header>

      <Drawer.Body py={4} className="app-scroll">
        <VStack align="stretch" gap={5}>
          <Box>
            <SectionTitle>Appearance</SectionTitle>
            <Box mt={3}>
              <OptionRow
                label="Color mode"
                value={mode}
                options={colorModes}
                accentPalette={accentPalette}
                onChange={setMode}
              />
            </Box>
          </Box>

          <Separator borderColor="border.subtle" />

          <Box>
            <SectionTitle>Accent color</SectionTitle>
            <HStack mt={3} gap={2} flexWrap="wrap">
              {accentOptions.map(({ key, label }) => {
                const selected = config.accent === key
                return (
                  <Button
                    key={key}
                    size="sm"
                    aria-label={label}
                    aria-pressed={selected}
                    title={label}
                    w={9}
                    h={9}
                    minW={9}
                    p={0}
                    borderRadius="full"
                    borderWidth="2px"
                    borderColor={selected ? 'var(--app-accent)' : 'border.subtle'}
                    bg={accentSwatches[key]}
                    boxShadow={selected ? '0 0 0 2px var(--nav-active-bg)' : undefined}
                    onClick={() => setConfig({ accent: key })}
                  />
                )
              })}
            </HStack>
          </Box>

          <Separator borderColor="border.subtle" />

          <SectionTitle>Layout</SectionTitle>

          <OptionRow
            label="Corner radius"
            value={config.radius}
            options={radiusOptions}
            accentPalette={accentPalette}
            onChange={(radius) => setConfig({ radius })}
          />

          <OptionRow
            label="Font size"
            value={config.fontScale}
            options={fontOptions}
            accentPalette={accentPalette}
            onChange={(fontScale) => setConfig({ fontScale })}
          />

          <OptionRow
            label="Density"
            value={config.density}
            options={densityOptions}
            accentPalette={accentPalette}
            onChange={(density) => setConfig({ density })}
          />

          <Separator borderColor="border.subtle" />

          <SectionTitle>Motion</SectionTitle>

          <HStack justify="space-between" py={1}>
            <Box>
              <Text fontSize="sm" fontWeight="medium">
                Page transitions
              </Text>
              <Text fontSize="xs" color="fg.muted">
                Animate when navigating between pages
              </Text>
            </Box>
            <Switch.Root
              checked={config.pageTransitions}
              onCheckedChange={(e) => setConfig({ pageTransitions: !!e.checked })}
              colorPalette={accentPalette}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>

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

          <HStack justify="space-between" py={1}>
            <Box>
              <Text fontSize="sm" fontWeight="medium">
                Reduce motion
              </Text>
              <Text fontSize="xs" color="fg.muted">
                Minimize animations site-wide
              </Text>
            </Box>
            <Switch.Root
              checked={config.reducedMotion}
              onCheckedChange={(e) => setConfig({ reducedMotion: !!e.checked })}
              colorPalette={accentPalette}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>

          <Box
            p={3}
            borderRadius="var(--radius-input)"
            bg="bg.input"
            fontSize="xs"
            color="fg.muted"
            fontFamily="mono"
          >
            accent: {config.accent} · mode: {mode} · transition:{' '}
            {config.pageTransitions ? config.pageTransition : 'off'}
          </Box>

          <Button
            size="sm"
            variant="outline"
            borderColor="border.subtle"
            borderRadius="var(--radius-input)"
            w="full"
            onClick={resetConfig}
          >
            Reset to defaults
          </Button>
        </VStack>
      </Drawer.Body>

      <Drawer.Footer borderTopWidth="1px" borderColor="border.subtle" py={3}>
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
      <Settings size={18} strokeWidth={2} />
    </IconButton>
  )
}
